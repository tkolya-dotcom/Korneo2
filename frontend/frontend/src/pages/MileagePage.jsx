'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../api';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

const MAPBOX_TOKEN = 'pk.eyJ1IjoidGtvbHlhIiwiYSI6ImNtbXZ0eGI1ODJkbnIycXNkMTBteWNvd20ifQ.m0WVg1Ix7RuR3AJyHDHRtg';
const MAPBOX_STYLE_ID = 'mapbox/dark-v11';
const DISTANCE_RATE_RUB = 17;
const MAX_CACHE_SIZE = 500;

const formatKm = (km) => km?.toFixed(1) || '0.0';
const formatRub = (rub) => rub?.toFixed(2) || '0.00';
const formatDate = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
};

const C = {
  bg: '#0A0A0F',
  card: '#1A1A2E',
  accent: '#00D9FF',
  text: '#E0E0E0',
  sub: '#8892a0',
  border: 'rgba(0, 217, 255, 0.15)',
  success: '#00FF88',
  warning: '#F59E0B',
};

// Helper functions
const round = (value, digits = 2) => {
  if (!Number.isFinite(value)) return 0;
  const power = Math.pow(10, digits);
  return Math.round(value * power) / power;
};

const getRangeBounds = (period, anchorDate) => {
  const y = anchorDate.getFullYear();
  const m = anchorDate.getMonth();
  const d = anchorDate.getDate();

  if (period === 'day') {
    return {
      start: new Date(y, m, d, 0, 0, 0, 0),
      end: new Date(y, m, d, 23, 59, 59, 999)
    };
  }
  if (period === 'month') {
    return {
      start: new Date(y, m, 1, 0, 0, 0, 0),
      end: new Date(y, m + 1, 0, 23, 59, 59, 999)
    };
  }
  return {
    start: new Date(y, 0, 1, 0, 0, 0, 0),
    end: new Date(y, 11, 31, 23, 59, 59, 999)
  };
};

const getUserLabel = (selectedUserId, usersMap) => {
  if (!selectedUserId) return 'Все пользователи';
  return usersMap[selectedUserId] || 'Пользователь';
};

// Build map preview URL like mobile app
const buildMapPreviewUrl = (segments) => {
  if (!MAPBOX_TOKEN || !segments || segments.length === 0) {
    return '';
  }

  const points = [
    { lat: segments[0].from_lat, lng: segments[0].from_lng },
    ...segments.map((segment) => ({ lat: segment.to_lat, lng: segment.to_lng })),
  ].filter((point) => Number.isFinite(point.lat) && Number.isFinite(point.lng));

  if (!points.length) return '';

  const center = points.reduce(
    (acc, point) => ({ lat: acc.lat + point.lat, lng: acc.lng + point.lng }),
    { lat: 0, lng: 0 }
  );
  const centerLat = center.lat / points.length;
  const centerLng = center.lng / points.length;

  const line = points.map((point) => `${point.lng},${point.lat}`).join(';');
  const markers = points
    .slice(0, 20)
    .map((point, index) => `pin-s+${index === 0 ? 'F59E0B' : '00D9FF'}(${point.lng},${point.lat})`)
    .join(',');
  const overlays = [`path-4+00D9FF-0.6(${line})`, markers].filter(Boolean).join(',');

  return `https://api.mapbox.com/styles/v1/${MAPBOX_STYLE_ID}/static/${overlays}/${centerLng},${centerLat},10.5,0/1200x760?access_token=${MAPBOX_TOKEN}&logo=false&attribution=false`;
};

// Fetch distance using Mapbox Directions API
const fetchDistanceKm = async (from, to) => {
  if (!MAPBOX_TOKEN) return 0;
  try {
    const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${from.lng},${from.lat};${to.lng},${to.lat}?alternatives=false&overview=false&steps=false&access_token=${MAPBOX_TOKEN}`;
    const response = await fetch(url);
    if (!response.ok) return 0;
    const payload = await response.json();
    const meters = payload.routes?.[0]?.distance;
    if (!meters || meters <= 0) return 0;
    return meters / 1000;
  } catch {
    return 0;
  }
};

// Geocode address
const geocodeAddress = async (address) => {
  if (!MAPBOX_TOKEN || !address) return null;
  try {
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(address)}.json?limit=1&language=ru&access_token=${MAPBOX_TOKEN}`;
    const response = await fetch(url);
    if (!response.ok) return null;
    const payload = await response.json();
    const center = payload.features?.[0]?.center;
    if (!center || center.length < 2) return null;
    return { lng: center[0], lat: center[1] };
  } catch {
    return null;
  }
};

export default function MileagePage() {
  const { user } = useAuth();
  const mapContainer = useRef(null);
  const mapInstance = useRef(null);
  const markersRef = useRef([]);
  const [selectedPeriod, setSelectedPeriod] = useState('day');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [users, setUsers] = useState([]);
  const [usersMap, setUsersMap] = useState({});
  const [report, setReport] = useState(null);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [usersModalOpen, setUsersModalOpen] = useState(false);
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [mapPreviewUrl, setMapPreviewUrl] = useState('');

  const loadUsers = useCallback(async () => {
    try {
      const { data } = await supabase.from('users').select('id, name, email, role');
      if (data) {
        const userList = data.map(u => ({
          id: u.id,
          name: u.name || u.email || 'Пользователь'
        }));
        setUsers(userList);
        const map = userList.reduce((acc, u) => {
          acc[u.id] = u.name;
          return acc;
        }, {});
        setUsersMap(map);
      }
    } catch (err) {
      console.error('Error loading users:', err);
      setUsers([]);
    }
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const { start, end } = getRangeBounds(selectedPeriod, selectedDate);
      
      // Fetch jobs with coordinates
      const { data: jobsData } = await supabase
        .from('jobs')
        .select('*')
        .gte('started_at', start.toISOString())
        .lte('started_at', end.toISOString())
        .not('address', 'is', null);

      let points = (jobsData || []).filter(j => j.lat && j.lng && j.address);
      
      // Try geocoding if no coordinates
      const geocodeCache = {};
      for (const point of points) {
        if (!point.lat || !point.lng) {
          const geocodeKey = point.address?.toLowerCase();
          if (geocodeKey && !geocodeCache[geocodeKey]) {
            const geocoded = await geocodeAddress(point.address);
            geocodeCache[geocodeKey] = geocoded;
          }
          if (geocodeCache[geocodeKey]) {
            point.lat = geocodeCache[geocodeKey].lat;
            point.lng = geocodeCache[geocodeKey].lng;
          }
        }
      }
      
      points = points.filter(p => p.lat && p.lng);
      
      if (selectedUserId) {
        points = points.filter(p => 
          p.engineer_id === selectedUserId || 
          p.executor_id === selectedUserId || 
          p.assignee_id === selectedUserId
        );
      }

      points.sort((a, b) => new Date(a.started_at) - new Date(b.started_at));
      
      // Group by user
      const pointsByUser = {};
      points.forEach(point => {
        const ownerId = point.engineer_id || point.executor_id || point.assignee_id || 'unknown';
        if (!pointsByUser[ownerId]) pointsByUser[ownerId] = [];
        pointsByUser[ownerId].push(point);
      });

      // Build segments with Mapbox distance
      const segments = [];
      let segmentIndex = 1;
      
      for (const [ownerId, ownerPoints] of Object.entries(pointsByUser)) {
        ownerPoints.sort((a, b) => new Date(a.started_at) - new Date(b.started_at));
        
        for (let i = 0; i < ownerPoints.length - 1; i++) {
          const from = ownerPoints[i];
          const to = ownerPoints[i + 1];
          
          // Get distance from Mapbox
          const distanceKm = await fetchDistanceKm(
            { lat: from.lat, lng: from.lng },
            { lat: to.lat, lng: to.lng }
          );
          
          const safeDistance = round(distanceKm || 0, 3);
          const userName = usersMap[ownerId] || 'Пользователь';
          
          segments.push({
            index: segmentIndex,
            user_id: ownerId,
            user_name: userName,
            from_job_id: from.id,
            to_job_id: to.id,
            from_address: from.address,
            to_address: to.address,
            from_lat: from.lat,
            from_lng: from.lng,
            to_lat: to.lat,
            to_lng: to.lng,
            started_at: from.started_at,
            ended_at: to.started_at || to.finished_at,
            distance_km: safeDistance,
            compensation_rub: round(safeDistance * DISTANCE_RATE_RUB, 2)
          });
          segmentIndex++;
        }
      }

      const totalKm = round(segments.reduce((sum, s) => sum + s.distance_km, 0), 3);

      // Fetch counters
      const { data: tasksData } = await supabase
        .from('tasks')
        .select('id, status, completed_at, assignee_id')
        .gte('completed_at', start.toISOString())
        .lte('completed_at', end.toISOString());

      const { data: installationsData } = await supabase
        .from('installations')
        .select('id, status, completed_at, assignee_id')
        .gte('completed_at', start.toISOString())
        .lte('completed_at', end.toISOString());

      const isCompleted = (status) => ['done', 'completed', 'closed', 'approved', 'issued', 'received'].includes(status);
      const userFilter = selectedUserId ? { assignee_id: selectedUserId } : {};

      setReport({
        period: selectedPeriod,
        period_start: start.toISOString(),
        period_end: end.toISOString(),
        user_id: selectedUserId,
        user_label: getUserLabel(selectedUserId, usersMap),
        total_km: totalKm,
        compensation_rub: round(totalKm * DISTANCE_RATE_RUB, 2),
        jobs_count: points.length,
        segments,
        counters: {
          completed_tasks: (tasksData || []).filter(t => 
            isCompleted(t.status) &&
            (!selectedUserId || t.assignee_id === selectedUserId)
          ).length,
          completed_installations: (installationsData || []).filter(i =>
            isCompleted(i.status) &&
            (!selectedUserId || i.assignee_id === selectedUserId)
          ).length,
          completed_requests: 0,
          completed_address_works: points.filter(p => isCompleted(p.status)).length
        }
      });

      // Build map preview URL
      setMapPreviewUrl(buildMapPreviewUrl(segments));

      // Build summary for all periods
      const buildPeriodSummary = async (period) => {
        const { start: pStart, end: pEnd } = getRangeBounds(period, selectedDate);
        const { data: periodJobs } = await supabase
          .from('jobs')
          .select('*')
          .gte('started_at', pStart.toISOString())
          .lte('started_at', pEnd.toISOString())
          .not('address', 'is', null);
        let filtered = (periodJobs || []).filter(j => j.lat && j.lng && j.address);
        if (selectedUserId) {
          filtered = filtered.filter(p =>
            p.engineer_id === selectedUserId ||
            p.executor_id === selectedUserId ||
            p.assignee_id === selectedUserId
          );
        }
        return {
          total_km: 0,
          compensation_rub: 0,
          jobs_count: filtered.length
        };
      };
      
      const [daySummary, monthSummary, yearSummary] = await Promise.all([
        buildPeriodSummary('day'),
        buildPeriodSummary('month'),
        buildPeriodSummary('year')
      ]);
      
      setSummary({
        day: daySummary,
        month: monthSummary,
        year: yearSummary
      });
    } catch (err) {
      console.error('Error loading mileage data:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedPeriod, selectedDate, selectedUserId, usersMap]);

  useEffect(() => {
    loadUsers().then(() => {
      setTimeout(() => loadData(), 100);
    });
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  useEffect(() => {
    if (!loading && report?.segments?.length > 0) {
      updateMap();
    }
  }, [report, loading]);

  const updateMap = () => {
    if (!mapInstance.current || !report?.segments?.length) return;

    // Clear old markers
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    // Get all points
    const allPoints = [];
    report.segments.forEach(seg => {
      const fromExists = allPoints.find(p => p.lat === seg.from_lat && p.lng === seg.from_lng);
      const toExists = allPoints.find(p => p.lat === seg.to_lat && p.lng === seg.to_lng);
      if (!fromExists) allPoints.push({ lat: seg.from_lat, lng: seg.from_lng, address: seg.from_address });
      if (!toExists) allPoints.push({ lat: seg.to_lat, lng: seg.to_lng, address: seg.to_address });
    });

    if (allPoints.length === 0) return;

    // Calculate center
    const center = allPoints.reduce((acc, p) => ({
      lat: acc.lat + p.lat,
      lng: acc.lng + p.lng
    }), { lat: 0, lng: 0 });
    center.lat /= allPoints.length;
    center.lng /= allPoints.length;

    // Set bounds
    mapInstance.current.flyTo({
      center: [center.lng, center.lat],
      zoom: 10,
      duration: 1500
    });

    // Add markers
    allPoints.forEach((point, idx) => {
      const el = document.createElement('div');
      const isStart = idx === 0;
      const isEnd = idx === allPoints.length - 1;
      const color = isStart ? '#F59E0B' : '#00D9FF';
      el.innerHTML = `<svg width="24" height="32" viewBox="0 0 24 32" fill="none"><path d="M12 0C5.4 0 0 5.4 0 12c0 9 12 20 12 20s12-11 12-20c0-6.6-5.4-12-12-12z" fill="${color}"/><circle cx="12" cy="12" r="5" fill="#fff"/></svg>`;
      
      const marker = new mapboxgl.Marker(el)
        .setLngLat([point.lng, point.lat])
        .setPopup(new mapboxgl.Popup({ offset: 25 }).setHTML(`<div style="color:#333;font-size:12px"><b>${isStart ? 'Старт' : isEnd ? 'Финиш' : 'Точка ' + (idx + 1)}</b><br>${point.address}</div>`))
        .addTo(mapInstance.current);
      markersRef.current.push(marker);
    });

    // Draw route line
    const routeCoords = [];
    report.segments.forEach((seg, idx) => {
      if (idx === 0) {
        routeCoords.push([seg.from_lng, seg.from_lat]);
      }
      routeCoords.push([seg.to_lng, seg.to_lat]);
    });

    const source = mapInstance.current.getSource('route');
    if (source) {
      source.setData({
        type: 'Feature',
        properties: {},
        geometry: { type: 'LineString', coordinates: routeCoords }
      });
    } else {
      mapInstance.current.addSource('route', {
        type: 'geojson',
        data: {
          type: 'Feature',
          properties: {},
          geometry: { type: 'LineString', coordinates: routeCoords }
        }
      });

      mapInstance.current.addLayer({
        id: 'route',
        type: 'line',
        source: 'route',
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: {
          'line-color': '#00D9FF',
          'line-width': 4,
          'line-opacity': 0.8
        }
      });
    }
  };

  // Initialize map
  useEffect(() => {
    if (!mapInstance.current && mapContainer.current) {
      mapboxgl.accessToken = MAPBOX_TOKEN;
      
      const map = new mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/dark-v11',
        center: [37.6173, 55.7558],
        zoom: 10
      });

      map.addControl(new mapboxgl.NavigationControl(), 'top-right');
      map.on('load', () => {
        mapInstance.current = map;
        if (!loading && report?.segments?.length > 0) {
          updateMap();
        }
      });
    }

    return () => {
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
    };
  }, []);

  const handlePeriodChange = (period) => {
    setSelectedPeriod(period);
  };

  const handleDateChange = (direction) => {
    setSelectedDate(prev => {
      const next = new Date(prev);
      if (selectedPeriod === 'day') next.setDate(next.getDate() + (direction === 'next' ? 1 : -1));
      else if (selectedPeriod === 'month') next.setMonth(next.getMonth() + (direction === 'next' ? 1 : -1));
      else next.setFullYear(next.getFullYear() + (direction === 'next' ? 1 : -1));
      return next;
    });
  };

  const getDateLabel = () => {
    if (selectedPeriod === 'day') {
      return selectedDate.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
    }
    if (selectedPeriod === 'month') {
      return selectedDate.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' });
    }
    return selectedDate.getFullYear().toString();
  };

  const getSelectedUserName = () => {
    if (!selectedUserId) return 'Все пользователи';
    return users.find(u => u.id === selectedUserId)?.name || 'Пользователь';
  };

  const handleExport = async (format) => {
    if (!report) return;
    setExporting(true);
    
    try {
      const stamp = new Date().toISOString().replace(/[:.]/g, '-');
      const fileName = `korneo-mileage-${report.period}-${stamp}.${format}`;
      
      if (format === 'csv') {
        const summaryRows = [
          ['Период', 'Км', 'Компенсация руб', 'Работ'],
          ['День', summary?.day?.total_km?.toFixed(3) || 0, summary?.day?.compensation_rub?.toFixed(2) || 0, summary?.day?.jobs_count || 0],
          ['Месяц', summary?.month?.total_km?.toFixed(3) || 0, summary?.month?.compensation_rub?.toFixed(2) || 0, summary?.month?.jobs_count || 0],
          ['Год', summary?.year?.total_km?.toFixed(3) || 0, summary?.year?.compensation_rub?.toFixed(2) || 0, summary?.year?.jobs_count || 0],
        ];
        const header = ['#', 'Пользователь', 'Откуда', 'Куда', 'Км', 'Компенсация ₽'];
        const segmentRows = report.segments.map(s => [
          s.index, s.user_name, s.from_address, s.to_address, 
          s.distance_km.toFixed(3), s.compensation_rub.toFixed(2)
        ]);
        const csv = [...summaryRows.map(r => r.join(';')), '', header.join(';'), ...segmentRows.map(r => r.join(';'))].join('\n');
        
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error('Export error:', err);
      alert('Ошибка экспорта');
    } finally {
      setExporting(false);
      setExportModalOpen(false);
    }
  };

  if (loading) {
    return (
      <div className="loading" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', background: C.bg }}>
        <div style={{ color: C.accent, fontSize: '24px' }}>Загрузка...</div>
      </div>
    );
  }

  return (
    <div>
      <header className="header">
        <h1>Система управления задачами</h1>
        <nav className="header-nav">
          <Link to="/">Главная</Link>
          <Link to="/projects">Проекты</Link>
          <Link to="/tasks">Задачи</Link>
          <Link to="/installations">Монтажи</Link>
          <Link to="/purchase-requests">Заявки</Link>
          <Link to="/mileage" style={{ color: C.accent }}>Учёт пробега</Link>
        </nav>
        <div className="header-user">
          <span>{user.name} ({user.role === 'manager' ? 'Руководитель' : 'Исполнитель'})</span>
        </div>
      </header>

      <main className="container">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ color: C.text }}>Учёт пробега</h2>
          <button 
            className="btn btn-primary"
            onClick={() => setExportModalOpen(true)}
            style={{ background: 'transparent', border: `1px solid ${C.accent}`, color: C.accent }}
          >
            Экспорт
          </button>
        </div>

        {/* Period Selector */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
          {['day', 'month', 'year'].map(period => (
            <button
              key={period}
              className={`btn ${selectedPeriod === period ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => handlePeriodChange(period)}
              style={{
                flex: 1,
                background: selectedPeriod === period ? C.accent : 'transparent',
                color: selectedPeriod === period ? '#000' : C.text,
                border: `1px solid ${C.accent}`
              }}
            >
              {period === 'day' ? 'День' : period === 'month' ? 'Месяц' : 'Год'}
            </button>
          ))}
        </div>

        {/* Date Navigation */}
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          gap: '16px', 
          marginBottom: '16px' 
        }}>
          <button 
            className="btn btn-secondary"
            onClick={() => handleDateChange('prev')}
            style={{ 
              width: '36px', 
              height: '36px', 
              padding: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            ‹
          </button>
          <span style={{ color: C.text, fontSize: '16px', fontWeight: '600' }}>
            {getDateLabel()}
          </span>
          <button 
            className="btn btn-secondary"
            onClick={() => handleDateChange('next')}
            style={{ 
              width: '36px', 
              height: '36px', 
              padding: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            ›
          </button>
        </div>

        {/* User Selector */}
        <div 
          onClick={() => setUsersModalOpen(true)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            background: C.card,
            padding: '12px 14px',
            borderRadius: '12px',
            marginBottom: '16px',
            cursor: 'pointer',
            border: `1px solid ${C.border}`
          }}
        >
          <span style={{ color: C.accent, fontSize: '18px' }}>👤</span>
          <span style={{ color: C.text, flex: 1 }}>{getSelectedUserName()}</span>
          <span style={{ color: C.sub }}>▼</span>
        </div>

        {/* Summary Cards */}
        {summary && (
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(3, 1fr)', 
            gap: '10px', 
            marginBottom: '16px' 
          }}>
            <SummaryCard label="Сутки" km={summary.day.total_km} compensation={summary.day.compensation_rub} jobs={summary.day.jobs_count} color={C.accent} />
            <SummaryCard label="Месяц" km={summary.month.total_km} compensation={summary.month.compensation_rub} jobs={summary.month.jobs_count} color={C.success} />
            <SummaryCard label="Год" km={summary.year.total_km} compensation={summary.year.compensation_rub} jobs={summary.year.jobs_count} color={C.warning} />
          </div>
        )}

        {/* Route Preview Image (like mobile app) */}
        {mapPreviewUrl && (
          <div style={{
            marginBottom: '16px',
            borderRadius: '14px',
            overflow: 'hidden',
            background: C.card
          }}>
            <img 
              src={mapPreviewUrl} 
              alt="Маршрут" 
              style={{ width: '100%', height: '180px', objectFit: 'cover' }}
              onError={(e) => { e.target.style.display = 'none'; }}
            />
          </div>
        )}

        {/* Interactive Map */}
        <div 
          ref={mapContainer}
          style={{
            height: '350px',
            borderRadius: '14px',
            overflow: 'hidden',
            marginBottom: '16px',
            border: `1px solid ${C.border}`
          }}
        />

        {/* Segments Header */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          marginBottom: '12px' 
        }}>
          <h3 style={{ color: C.text, fontSize: '16px', fontWeight: '700' }}>Сегменты пробега</h3>
          <span style={{ color: C.sub, fontSize: '12px' }}>
            {report?.segments?.length || 0} записей
          </span>
        </div>

        {/* Segments List */}
        {report?.segments?.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px' }}>
            {report.segments.map(segment => (
              <div key={`segment-${segment.index}`} className="card" style={{
                display: 'flex',
                gap: '12px',
                padding: '12px',
                background: C.card
              }}>
                <div style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '8px',
                  background: 'rgba(0, 217, 255, 0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: C.accent,
                  fontSize: '12px',
                  fontWeight: '700',
                  flexShrink: 0
                }}>
                  {segment.index}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                    <span style={{ color: C.warning, fontSize: '12px' }}>📍</span>
                    <span style={{ color: C.text, fontSize: '13px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {segment.from_address}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                    <span style={{ color: C.sub, fontSize: '10px' }}>↓</span>
                    <span style={{ color: C.accent, fontSize: '12px', fontWeight: '600' }}>
                      {formatKm(segment.distance_km)} км
                    </span>
                    <span style={{ color: C.sub, fontSize: '11px' }}>
                      {formatRub(segment.compensation_rub)} ₽
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                    <span style={{ color: C.accent, fontSize: '12px' }}>📍</span>
                    <span style={{ color: C.text, fontSize: '13px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {segment.to_address}
                    </span>
                  </div>
                  <div style={{ color: C.sub, fontSize: '11px' }}>
                    {formatDate(segment.started_at)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="card" style={{ 
            textAlign: 'center', 
            padding: '40px',
            background: C.card
          }}>
            <div style={{ fontSize: '48px', marginBottom: '12px' }}>🚗</div>
            <p style={{ color: C.sub }}>Нет данных о пробеге за этот период</p>
          </div>
        )}

        {/* Counters */}
        {report && (
          <div className="card" style={{ background: C.card }}>
            <h3 style={{ color: C.text, fontSize: '14px', fontWeight: '600', marginBottom: '12px' }}>
              Счётчики работ
            </h3>
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(4, 1fr)', 
              gap: '12px' 
            }}>
              <div style={{ textAlign: 'center', padding: '8px' }}>
                <div style={{ color: C.accent, fontSize: '22px', fontWeight: '800' }}>
                  {report.counters.completed_tasks}
                </div>
                <div style={{ color: C.sub, fontSize: '12px', marginTop: '4px' }}>Задачи</div>
              </div>
              <div style={{ textAlign: 'center', padding: '8px' }}>
                <div style={{ color: C.accent, fontSize: '22px', fontWeight: '800' }}>
                  {report.counters.completed_installations}
                </div>
                <div style={{ color: C.sub, fontSize: '12px', marginTop: '4px' }}>Монтажи</div>
              </div>
              <div style={{ textAlign: 'center', padding: '8px' }}>
                <div style={{ color: C.accent, fontSize: '22px', fontWeight: '800' }}>
                  {report.counters.completed_requests}
                </div>
                <div style={{ color: C.sub, fontSize: '12px', marginTop: '4px' }}>Заявки</div>
              </div>
              <div style={{ textAlign: 'center', padding: '8px' }}>
                <div style={{ color: C.accent, fontSize: '22px', fontWeight: '800' }}>
                  {report.counters.completed_address_works}
                </div>
                <div style={{ color: C.sub, fontSize: '12px', marginTop: '4px' }}>Адреса</div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* User Picker Modal */}
      {usersModalOpen && (
        <div className="modal-overlay" onClick={() => setUsersModalOpen(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ background: C.card }}>
            <div className="modal-header">
              <h2 style={{ color: C.text }}>Выбор инженера</h2>
              <button className="modal-close" onClick={() => setUsersModalOpen(false)}>×</button>
            </div>
            <div>
              <div 
                onClick={() => { setSelectedUserId(null); setUsersModalOpen(false); }}
                style={{
                  padding: '14px',
                  cursor: 'pointer',
                  background: selectedUserId === null ? 'rgba(0, 217, 255, 0.1)' : 'transparent',
                  borderRadius: '8px',
                  color: selectedUserId === null ? C.accent : C.text
                }}
              >
                Все пользователи
              </div>
              {users.map(userOpt => (
                <div
                  key={userOpt.id}
                  onClick={() => { setSelectedUserId(userOpt.id); setUsersModalOpen(false); }}
                  style={{
                    padding: '14px',
                    cursor: 'pointer',
                    background: selectedUserId === userOpt.id ? 'rgba(0, 217, 255, 0.1)' : 'transparent',
                    borderRadius: '8px',
                    color: selectedUserId === userOpt.id ? C.accent : C.text,
                    fontWeight: selectedUserId === userOpt.id ? '600' : '400'
                  }}
                >
                  {userOpt.name}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Export Modal */}
      {exportModalOpen && (
        <div className="modal-overlay" onClick={() => setExportModalOpen(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ background: C.card }}>
            <div className="modal-header">
              <h2 style={{ color: C.text }}>Экспорт отчёта</h2>
              <button className="modal-close" onClick={() => setExportModalOpen(false)}>×</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '16px' }}>
              <button 
                className="btn btn-primary"
                onClick={() => handleExport('csv')}
                disabled={exporting}
                style={{ 
                  padding: '16px',
                  background: 'rgba(0, 217, 255, 0.1)',
                  color: C.accent,
                  border: 'none'
                }}
              >
                📊 CSV (Excel)
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .marker-start, .marker-end {
          cursor: pointer;
        }
        .mapboxgl-ctrl-group {
          background: ${C.card} !important;
        }
        .mapboxgl-ctrl-group button {
          background: ${C.card} !important;
          color: ${C.text} !important;
        }
      `}</style>
    </div>
  );
}

function SummaryCard({ label, km, compensation, jobs, color }) {
  return (
    <div style={{
      background: C.card,
      borderRadius: '14px',
      padding: '16px',
      borderLeft: `3px solid ${color}`
    }}>
      <div style={{ color: C.sub, fontSize: '12px', marginBottom: '8px' }}>{label}</div>
      <div style={{ display: 'flex', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
          <span style={{ color: color, fontSize: '18px', fontWeight: '700' }}>{formatKm(km)}</span>
          <span style={{ color: C.sub, fontSize: '11px' }}>км</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
          <span style={{ color: C.text, fontSize: '18px', fontWeight: '700' }}>{formatRub(compensation)}</span>
          <span style={{ color: C.sub, fontSize: '11px' }}>₽</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
          <span style={{ color: C.text, fontSize: '18px', fontWeight: '700' }}>{jobs}</span>
          <span style={{ color: C.sub, fontSize: '11px' }}>раб.</span>
        </div>
      </div>
    </div>
  );
}

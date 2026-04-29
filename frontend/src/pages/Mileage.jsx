import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase, usersApi } from '../api';

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN || import.meta.env.VITE_EXPO_PUBLIC_MAPBOX_TOKEN || 'pk.eyJ1IjoidGtvbHlhIiwiYSI6ImNtbXZ0eGI1ODJkbnIycXNkMTBteWNvd20ifQ.m0WVg1Ix7RuR3AJyHDHRtg';
const DISTANCE_RATE_DEFAULT = 17;

const toNum = (v) => {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  const n = Number(String(v || '').replace(',', '.'));
  return Number.isFinite(n) ? n : null;
};

const haversine = (a, b) => {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLon = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.sin(dLon / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * R * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
};

const periodBounds = (period, date) => {
  const d = new Date(date);
  if (period === 'day') return [new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0), new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59)];
  if (period === 'month') return [new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0), new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59)];
  return [new Date(d.getFullYear(), 0, 1, 0, 0, 0), new Date(d.getFullYear(), 11, 31, 23, 59, 59)];
};

const normalizeTaskPoint = (row, usersMap) => {
  const lat = toNum(row.lat ?? row.latitude);
  const lng = toNum(row.lng ?? row.longitude);
  if (lat == null || lng == null) return null;
  const ownerId = String(row.assignee_id || row.engineer_id || row.user_id || row.created_by || '');
  const startedAt = row.finished_at || row.completed_at || row.updated_at || row.created_at;
  if (!startedAt) return null;
  return {
    id: String(row.id),
    ownerId,
    ownerName: usersMap[ownerId] || 'Пользователь',
    address: row.address || row.title || 'Адрес не указан',
    lat,
    lng,
    startedAt,
  };
};

function Mileage() {
  const { user, isManager } = useAuth();
  const [period, setPeriod] = useState('day');
  const [date, setDate] = useState(new Date());
  const [users, setUsers] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState('all');
  const [loading, setLoading] = useState(true);
  const [segments, setSegments] = useState([]);
  const [totalKm, setTotalKm] = useState(0);
  const [rate, setRate] = useState(DISTANCE_RATE_DEFAULT);
  const [manualKm, setManualKm] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    const rawUsers = await usersApi.getUsers().catch(() => []);
    const usersList = Array.isArray(rawUsers) ? rawUsers : rawUsers?.users || [];
    setUsers(usersList);
    const usersMap = Object.fromEntries(usersList.map((u) => [String(u.id), u.name || u.email || 'Пользователь']));

    const [from, to] = periodBounds(period, date);

    const [tasksRaw, installationsRaw, requestsRaw] = await Promise.all([
      supabase.from('tasks').select('*').gte('updated_at', from.toISOString()).lte('updated_at', to.toISOString()).in('status', ['done', 'completed']).then(r => r.data || []),
      supabase.from('installations').select('*').gte('updated_at', from.toISOString()).lte('updated_at', to.toISOString()).in('status', ['done', 'completed']).then(r => r.data || []),
      supabase.from('purchase_requests').select('*').gte('updated_at', from.toISOString()).lte('updated_at', to.toISOString()).in('status', ['approved', 'completed', 'received']).then(r => r.data || []),
    ]);

    const points = [...tasksRaw, ...installationsRaw, ...requestsRaw]
      .map((r) => normalizeTaskPoint(r, usersMap))
      .filter(Boolean)
      .filter((p) => (selectedUserId === 'all' ? true : p.ownerId === selectedUserId))
      .sort((a, b) => new Date(a.startedAt) - new Date(b.startedAt));

    const segs = [];
    for (let i = 1; i < points.length; i += 1) {
      const prev = points[i - 1];
      const cur = points[i];
      const km = Number(haversine({ lat: prev.lat, lng: prev.lng }, { lat: cur.lat, lng: cur.lng }).toFixed(3));
      segs.push({
        index: i,
        userName: cur.ownerName,
        fromAddress: prev.address,
        toAddress: cur.address,
        fromLat: prev.lat,
        fromLng: prev.lng,
        toLat: cur.lat,
        toLng: cur.lng,
        startedAt: prev.startedAt,
        endedAt: cur.startedAt,
        distanceKm: km,
      });
    }

    setSegments(segs);
    const sum = Number(segs.reduce((a, s) => a + s.distanceKm, 0).toFixed(3));
    setTotalKm(sum);
    setManualKm(String(sum));
    setLoading(false);
  }, [period, date, selectedUserId]);

  useEffect(() => {
    void load();
  }, [load]);

  const compensation = useMemo(() => {
    const km = Number.parseFloat(String(manualKm).replace(',', '.'));
    const safeKm = Number.isFinite(km) ? km : totalKm;
    return (safeKm * rate).toFixed(2);
  }, [manualKm, rate, totalKm]);

  const mapUrl = useMemo(() => {
    if (!segments.length || !MAPBOX_TOKEN) return '';
    const points = segments.flatMap((s) => [[s.fromLng, s.fromLat], [s.toLng, s.toLat]]).slice(0, 20);
    const uniq = [];
    const set = new Set();
    for (const p of points) {
      const key = `${p[0].toFixed(4)},${p[1].toFixed(4)}`;
      if (!set.has(key)) { set.add(key); uniq.push(p); }
    }
    const center = uniq.reduce((acc, p) => ({ lng: acc.lng + p[0], lat: acc.lat + p[1] }), { lng: 0, lat: 0 });
    const cLng = center.lng / uniq.length;
    const cLat = center.lat / uniq.length;
    const pins = uniq.map((p) => `pin-s+00D9FF(${p[0]},${p[1]})`).join(',');
    return `https://api.mapbox.com/styles/v1/mapbox/dark-v11/static/${pins}/${cLng},${cLat},9/1200x500?access_token=${MAPBOX_TOKEN}&logo=false&attribution=false`;
  }, [segments]);

  const routeLink = useMemo(() => {
    if (!segments.length) return '';
    const first = segments[0];
    const last = segments[segments.length - 1];
    const waypoints = segments.slice(0, -1).map((s) => `${s.toLat},${s.toLng}`).slice(0, 8).join('|');
    return `https://www.google.com/maps/dir/?api=1&origin=${first.fromLat},${first.fromLng}&destination=${last.toLat},${last.toLng}&waypoints=${encodeURIComponent(waypoints)}&travelmode=driving`;
  }, [segments]);

  const exportCsv = () => {
    const header = ['#', 'Пользователь', 'Откуда', 'Куда', 'Начало', 'Конец', 'Км'];
    const rows = segments.map((s) => [s.index, s.userName, s.fromAddress, s.toAddress, s.startedAt, s.endedAt, s.distanceKm]);
    const csv = [header, ...rows].map((r) => r.map((c) => `"${String(c).replaceAll('"', '""')}"`).join(';')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mileage-${period}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <header className="header">
        <h1>Пробег</h1>
        <nav className="header-nav">
          <Link to="/">Главная</Link>
          <Link to="/projects">Проекты</Link>
          <Link to="/tasks">Задачи</Link>
          <Link to="/installations">Монтажи</Link>
          <Link to="/purchase-requests">Заявки</Link>
          <Link to="/mileage">Пробег</Link>
        </nav>
      </header>
      <main className="container">
        <div className="card" style={{ display: 'grid', gap: 10 }}>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {['day', 'month', 'year'].map((p) => <button key={p} className="btn btn-secondary" onClick={() => setPeriod(p)}>{p}</button>)}
            <input type="date" value={date.toISOString().slice(0, 10)} onChange={(e) => setDate(new Date(e.target.value))} />
            <select value={selectedUserId} onChange={(e) => setSelectedUserId(e.target.value)}>
              <option value="all">Все пользователи</option>
              {users.map((u) => <option key={u.id} value={u.id}>{u.name || u.email || u.id}</option>)}
            </select>
            <button className="btn btn-primary" onClick={() => void load()}>Обновить</button>
            <button className="btn btn-success" onClick={exportCsv}>Сохранить отчет</button>
          </div>
          {isManager && (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <input value={manualKm} onChange={(e) => setManualKm(e.target.value)} placeholder="Км" />
              <input value={rate} onChange={(e) => setRate(Number.parseFloat(e.target.value) || 0)} placeholder="Ставка руб/км" />
            </div>
          )}
          <div><strong>Итого:</strong> {manualKm || totalKm} км / {compensation} руб.</div>
        </div>

        {loading ? <div className="loading">Загрузка...</div> : null}

        {mapUrl ? (
          <div className="card">
            <img src={mapUrl} alt="Маршрут" style={{ width: '100%', borderRadius: 8 }} />
            {routeLink ? <a className="btn btn-primary" href={routeLink} target="_blank" rel="noreferrer" style={{ marginTop: 10 }}>Открыть маршрут</a> : null}
          </div>
        ) : null}

        <div className="card">
          <h3 className="card-title">Сегменты ({segments.length})</h3>
          {segments.length === 0 ? <div className="empty-state">Нет данных о пробеге</div> : (
            <table className="table">
              <thead><tr><th>#</th><th>Пользователь</th><th>Откуда</th><th>Куда</th><th>Км</th></tr></thead>
              <tbody>
                {segments.map((s) => (
                  <tr key={s.index}><td>{s.index}</td><td>{s.userName}</td><td>{s.fromAddress}</td><td>{s.toAddress}</td><td>{s.distanceKm}</td></tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </main>
    </div>
  );
}

export default Mileage;

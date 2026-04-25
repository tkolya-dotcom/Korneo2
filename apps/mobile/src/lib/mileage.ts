import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import * as Print from 'expo-print';
import * as XLSX from 'xlsx';
import {
  installationsApi,
  jobsApi,
  purchaseRequestsApi,
  supabase,
  tasksApi,
  usersApi,
} from '@/src/lib/supabase';

export type MileagePeriod = 'day' | 'month' | 'year';

export type MileageSegment = {
  index: number;
  user_id: string;
  user_name: string;
  from_job_id: string;
  to_job_id: string;
  from_address: string;
  to_address: string;
  from_lat: number;
  from_lng: number;
  to_lat: number;
  to_lng: number;
  started_at: string;
  ended_at: string;
  distance_km: number;
  compensation_rub: number;
};

export type MileageCounters = {
  completed_tasks: number;
  completed_installations: number;
  completed_requests: number;
  completed_address_works: number;
};

export type MileageReport = {
  period: MileagePeriod;
  period_start: string;
  period_end: string;
  user_id: string | null;
  user_label: string;
  total_km: number;
  compensation_rub: number;
  jobs_count: number;
  segments: MileageSegment[];
  counters: MileageCounters;
  route_preview_url: string;
};

export type MileageSummaryCards = Record<MileagePeriod, { total_km: number; compensation_rub: number; jobs_count: number }>;

type JobPoint = {
  id: string;
  owner_id: string;
  owner_name: string;
  address: string;
  lat: number;
  lng: number;
  started_at: string;
  ended_at: string;
  status: string;
};

const DISTANCE_RATE_RUB = 17;
const MAPBOX_TOKEN =
  process.env.EXPO_PUBLIC_MAPBOX_TOKEN ||
  'pk.eyJ1IjoidGtvbHlhIiwiYSI6ImNtbXZ0eGI1ODJkbnIycXNkMTBteWNvd20ifQ.m0WVg1Ix7RuR3AJyHDHRtg';
const MAPBOX_STYLE_ID = 'mapbox/dark-v11';
const DISTANCE_CACHE_KEY = '@korneo/mileage_distance_cache_v1';
const MAX_CACHE_SIZE = 500;

const isPeriod = (value: string): value is MileagePeriod =>
  value === 'day' || value === 'month' || value === 'year';

const round = (value: number, digits = 2) => {
  if (!Number.isFinite(value)) return 0;
  const power = 10 ** digits;
  return Math.round(value * power) / power;
};

const toNumber = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number(value.trim().replace(',', '.'));
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

const toIso = (date: Date) => date.toISOString();

const getRangeBounds = (period: MileagePeriod, anchorDate: Date) => {
  const y = anchorDate.getFullYear();
  const m = anchorDate.getMonth();
  const d = anchorDate.getDate();

  if (period === 'day') {
    const start = new Date(y, m, d, 0, 0, 0, 0);
    const end = new Date(y, m, d, 23, 59, 59, 999);
    return { start, end };
  }

  if (period === 'month') {
    const start = new Date(y, m, 1, 0, 0, 0, 0);
    const end = new Date(y, m + 1, 0, 23, 59, 59, 999);
    return { start, end };
  }

  const start = new Date(y, 0, 1, 0, 0, 0, 0);
  const end = new Date(y, 11, 31, 23, 59, 59, 999);
  return { start, end };
};

const getPeriodBounds = getRangeBounds;

const inRange = (value: string | null | undefined, start: Date, end: Date) => {
  if (!value) return false;
  const ts = new Date(value).getTime();
  if (!Number.isFinite(ts)) return false;
  return ts >= start.getTime() && ts <= end.getTime();
};

const normalizeDateField = (row: Record<string, unknown>, keys: string[]) => {
  for (const key of keys) {
    const value = row[key];
    if (typeof value === 'string' && value.trim()) {
      return value;
    }
  }
  return '';
};

const normalizeOwnerId = (row: Record<string, unknown>) =>
  String(
    row.engineer_id ||
      row.executor_id ||
      row.assignee_id ||
      row.created_by ||
      row.user_id ||
      row.author_id ||
      ''
  ).trim();

const normalizeAddress = (row: Record<string, unknown>) =>
  String(row.address || row.address_text || row.location || '').trim();

const normalizeStatus = (row: Record<string, unknown>) => String(row.status || '').trim().toLowerCase();

const normalizePointDate = (row: Record<string, unknown>) =>
  normalizeDateField(row, ['started_at', 'created_at', 'date_from', 'updated_at']);

const normalizePointEndDate = (row: Record<string, unknown>) =>
  normalizeDateField(row, ['finished_at', 'completed_at', 'updated_at', 'started_at', 'created_at']);

const normalizeCompletionDate = (row: Record<string, unknown>) =>
  normalizeDateField(row, ['completed_at', 'finished_at', 'closed_at', 'received_at', 'updated_at', 'created_at']);

const isCompletedStatus = (status: string) =>
  ['done', 'completed', 'closed', 'approved', 'issued', 'received'].includes(status);

const isIgnorablePersistenceError = (error: unknown) => {
  if (!error || typeof error !== 'object') return false;
  const typed = error as { code?: string; message?: string };
  const message = (typed.message || '').toLowerCase();
  return (
    typed.code === '42P01' ||
    typed.code === '42703' ||
    typed.code === '42501' ||
    typed.code === 'PGRST204' ||
    message.includes('relation') ||
    message.includes('does not exist') ||
    message.includes('permission denied') ||
    message.includes('row-level security')
  );
};

const getDistanceCache = async () => {
  try {
    const raw = await AsyncStorage.getItem(DISTANCE_CACHE_KEY);
    if (!raw) return {} as Record<string, number>;
    const parsed = JSON.parse(raw) as Record<string, number> | null;
    if (!parsed || typeof parsed !== 'object') return {};
    return parsed;
  } catch {
    return {} as Record<string, number>;
  }
};

const persistDistanceCache = async (cache: Record<string, number>) => {
  const entries = Object.entries(cache);
  const trimmed = entries.slice(Math.max(0, entries.length - MAX_CACHE_SIZE));
  try {
    await AsyncStorage.setItem(DISTANCE_CACHE_KEY, JSON.stringify(Object.fromEntries(trimmed)));
  } catch {
    // ignore
  }
};

const getDistanceKey = (fromLat: number, fromLng: number, toLat: number, toLng: number) =>
  `${fromLat.toFixed(5)},${fromLng.toFixed(5)}->${toLat.toFixed(5)},${toLng.toFixed(5)}`;

const geocodeAddress = async (address: string) => {
  if (!MAPBOX_TOKEN || !address) return null;
  try {
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
      address
    )}.json?limit=1&language=ru&access_token=${MAPBOX_TOKEN}`;
    const response = await fetch(url);
    if (!response.ok) return null;
    const payload = (await response.json()) as { features?: Array<{ center?: [number, number] }> };
    const center = payload.features?.[0]?.center;
    if (!center || center.length < 2) return null;
    const lng = toNumber(center[0]);
    const lat = toNumber(center[1]);
    if (lat == null || lng == null) return null;
    return { lat, lng };
  } catch {
    return null;
  }
};

const fetchDistanceKm = async (from: { lat: number; lng: number }, to: { lat: number; lng: number }) => {
  if (!MAPBOX_TOKEN) return 0;
  try {
    const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${from.lng},${from.lat};${to.lng},${to.lat}?alternatives=false&overview=false&steps=false&access_token=${MAPBOX_TOKEN}`;
    const response = await fetch(url);
    if (!response.ok) return 0;
    const payload = (await response.json()) as { routes?: Array<{ distance?: number }> };
    const meters = toNumber(payload.routes?.[0]?.distance);
    if (meters == null || meters <= 0) return 0;
    return meters / 1000;
  } catch {
    return 0;
  }
};

const buildMapPreviewUrl = (segments: MileageSegment[]) => {
  if (!MAPBOX_TOKEN || segments.length === 0) {
    return '';
  }

  const points = [
    { lat: segments[0].from_lat, lng: segments[0].from_lng },
    ...segments.map((segment) => ({ lat: segment.to_lat, lng: segment.to_lng })),
  ].filter((point) => Number.isFinite(point.lat) && Number.isFinite(point.lng));

  if (!points.length) {
    return '';
  }

  const center = points.reduce(
    (acc, point) => ({
      lat: acc.lat + point.lat,
      lng: acc.lng + point.lng,
    }),
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

const persistMileageSnapshot = async (
  report: MileageReport,
  selectedDate: Date
) => {
  if (!report.user_id) {
    return;
  }

  const snapshotDate = selectedDate.toISOString().slice(0, 10);
  const deleteSegments = await supabase
    .from('mileage_segments')
    .delete()
    .eq('user_id', report.user_id)
    .eq('snapshot_date', snapshotDate)
    .eq('period_type', report.period);
  if (deleteSegments.error && !isIgnorablePersistenceError(deleteSegments.error)) {
    throw deleteSegments.error;
  }

  if (report.segments.length > 0) {
    const segmentRows = report.segments.map((segment) => ({
      user_id: segment.user_id,
      snapshot_date: snapshotDate,
      period_type: report.period,
      segment_index: segment.index,
      from_job_id: segment.from_job_id,
      to_job_id: segment.to_job_id,
      from_address: segment.from_address,
      to_address: segment.to_address,
      from_lat: segment.from_lat,
      from_lng: segment.from_lng,
      to_lat: segment.to_lat,
      to_lng: segment.to_lng,
      segment_start_at: segment.started_at,
      segment_end_at: segment.ended_at,
      distance_km: segment.distance_km,
      compensation_rub: segment.compensation_rub,
    }));

    const insertSegments = await supabase.from('mileage_segments').insert(segmentRows);
    if (insertSegments.error && !isIgnorablePersistenceError(insertSegments.error)) {
      throw insertSegments.error;
    }
  }

  const deleteAggregates = await supabase
    .from('mileage_aggregates')
    .delete()
    .eq('user_id', report.user_id)
    .eq('snapshot_date', snapshotDate)
    .eq('period_type', report.period);
  if (deleteAggregates.error && !isIgnorablePersistenceError(deleteAggregates.error)) {
    throw deleteAggregates.error;
  }

  const insertAggregate = await supabase.from('mileage_aggregates').insert([
    {
      user_id: report.user_id,
      snapshot_date: snapshotDate,
      period_type: report.period,
      period_start: report.period_start,
      period_end: report.period_end,
      total_km: report.total_km,
      compensation_rub: report.compensation_rub,
      jobs_count: report.jobs_count,
      completed_tasks: report.counters.completed_tasks,
      completed_installations: report.counters.completed_installations,
      completed_requests: report.counters.completed_requests,
      completed_address_works: report.counters.completed_address_works,
    },
  ]);
  if (insertAggregate.error && !isIgnorablePersistenceError(insertAggregate.error)) {
    throw insertAggregate.error;
  }
};

const getUserLabel = (selectedUserId: string | null, usersMap: Record<string, string>) => {
  if (!selectedUserId) {
    return 'Все пользователи';
  }
  return usersMap[selectedUserId] || selectedUserId;
};

const resolveOwnerName = (ownerId: string, usersMap: Record<string, string>) =>
  usersMap[ownerId] || 'Пользователь';

const loadUserNamesMap = async () => {
  const users = await usersApi.getAll().catch(() => []);
  return (users || []).reduce<Record<string, string>>((acc, user: any) => {
    const id = String(user.id || '').trim();
    if (!id) return acc;
    acc[id] = String(user.name || user.email || id);
    return acc;
  }, {});
};

const buildCounters = async (
  start: Date,
  end: Date,
  selectedUserId: string | null,
  points: JobPoint[]
): Promise<MileageCounters> => {
  const [tasks, installations, requests] = await Promise.all([
    tasksApi.getAll(selectedUserId ? { assignee_id: selectedUserId } : {}).catch(() => []),
    installationsApi.getAll(selectedUserId ? { assignee_id: selectedUserId } : {}).catch(() => []),
    purchaseRequestsApi.getAll(selectedUserId ? { created_by: selectedUserId } : {}).catch(() => []),
  ]);

  const countCompleted = (rows: any[]) =>
    rows.filter((row) => {
      const status = normalizeStatus(row as Record<string, unknown>);
      if (!isCompletedStatus(status)) return false;
      return inRange(normalizeCompletionDate(row as Record<string, unknown>), start, end);
    }).length;

  return {
    completed_tasks: countCompleted(Array.isArray(tasks) ? tasks : []),
    completed_installations: countCompleted(Array.isArray(installations) ? installations : []),
    completed_requests: countCompleted(Array.isArray(requests) ? requests : []),
    completed_address_works: points.filter((point) => isCompletedStatus(point.status)).length,
  };
};

const toCsvCell = (value: string | number) => {
  const text = String(value ?? '');
  if (text.includes('"') || text.includes(';') || text.includes('\n')) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
};

const formatPeriodLabel = (period: MileagePeriod) => {
  if (period === 'day') return 'Сутки';
  if (period === 'month') return 'Месяц';
  return 'Год';
};

export const mileageApi = {
  getPeriodBounds,

  buildReport: async (options: { period: MileagePeriod; anchorDate: Date; userId: string | null }) => {
    const { period, anchorDate, userId } = options;
    const { start, end } = getRangeBounds(period, anchorDate);
    const usersMap = await loadUserNamesMap();

    const allJobsRaw = await jobsApi.getAll({ include_done: true }).catch(() => []);
    const allJobs = (Array.isArray(allJobsRaw) ? allJobsRaw : []) as Record<string, unknown>[];
    const geocodeCache = new Map<string, { lat: number; lng: number } | null>();
    const distanceCache = await getDistanceCache();

    const pointsRaw: JobPoint[] = [];
    for (const row of allJobs) {
      const startedAt = normalizePointDate(row);
      if (!inRange(startedAt, start, end)) {
        continue;
      }

      const ownerId = normalizeOwnerId(row);
      if (userId && ownerId !== userId) {
        continue;
      }

      const address = normalizeAddress(row);
      if (!address) {
        continue;
      }

      let lat = toNumber(row.lat ?? row.latitude ?? row.y_coord ?? row.y);
      let lng = toNumber(row.lng ?? row.longitude ?? row.x_coord ?? row.x);
      if (lat == null || lng == null) {
        const geocodeKey = address.toLowerCase();
        if (!geocodeCache.has(geocodeKey)) {
          geocodeCache.set(geocodeKey, await geocodeAddress(address));
        }
        const geocoded = geocodeCache.get(geocodeKey);
        lat = geocoded?.lat ?? null;
        lng = geocoded?.lng ?? null;
      }

      if (lat == null || lng == null) {
        continue;
      }

      pointsRaw.push({
        id: String(row.id || ''),
        owner_id: ownerId || 'unknown',
        owner_name: resolveOwnerName(ownerId, usersMap),
        address,
        lat,
        lng,
        started_at: startedAt,
        ended_at: normalizePointEndDate(row),
        status: normalizeStatus(row),
      });
    }

    pointsRaw.sort((a, b) => new Date(a.started_at).getTime() - new Date(b.started_at).getTime());

    const pointsByOwner = pointsRaw.reduce<Record<string, JobPoint[]>>((acc, point) => {
      if (!acc[point.owner_id]) {
        acc[point.owner_id] = [];
      }
      acc[point.owner_id].push(point);
      return acc;
    }, {});

    const segments: MileageSegment[] = [];
    let segmentIndex = 1;

    for (const ownerPoints of Object.values(pointsByOwner)) {
      if (ownerPoints.length < 2) {
        continue;
      }

      ownerPoints.sort((a, b) => new Date(a.started_at).getTime() - new Date(b.started_at).getTime());

      for (let i = 0; i < ownerPoints.length - 1; i += 1) {
        const from = ownerPoints[i];
        const to = ownerPoints[i + 1];

        const cacheKey = getDistanceKey(from.lat, from.lng, to.lat, to.lng);
        let distanceKm = distanceCache[cacheKey];
        if (!Number.isFinite(distanceKm)) {
          distanceKm = await fetchDistanceKm(
            { lat: from.lat, lng: from.lng },
            { lat: to.lat, lng: to.lng }
          );
          distanceCache[cacheKey] = distanceKm;
        }

        const safeDistance = round(distanceKm || 0, 3);
        segments.push({
          index: segmentIndex,
          user_id: from.owner_id,
          user_name: from.owner_name,
          from_job_id: from.id,
          to_job_id: to.id,
          from_address: from.address,
          to_address: to.address,
          from_lat: from.lat,
          from_lng: from.lng,
          to_lat: to.lat,
          to_lng: to.lng,
          started_at: from.started_at,
          ended_at: to.started_at || to.ended_at || from.started_at,
          distance_km: safeDistance,
          compensation_rub: round(safeDistance * DISTANCE_RATE_RUB, 2),
        });
        segmentIndex += 1;
      }
    }

    await persistDistanceCache(distanceCache);

    const totalKm = round(segments.reduce((sum, segment) => sum + segment.distance_km, 0), 3);
    const report: MileageReport = {
      period,
      period_start: toIso(start),
      period_end: toIso(end),
      user_id: userId,
      user_label: getUserLabel(userId, usersMap),
      total_km: totalKm,
      compensation_rub: round(totalKm * DISTANCE_RATE_RUB, 2),
      jobs_count: pointsRaw.length,
      segments,
      counters: await buildCounters(start, end, userId, pointsRaw),
      route_preview_url: buildMapPreviewUrl(segments),
    };

    await persistMileageSnapshot(report, anchorDate).catch(() => {
      // optional DB persistence, ignore when tables are absent
    });

    return report;
  },

  buildSummaryCards: async (options: { anchorDate: Date; userId: string | null }): Promise<MileageSummaryCards> => {
    const [dayReport, monthReport, yearReport] = await Promise.all([
      mileageApi.buildReport({ period: 'day', anchorDate: options.anchorDate, userId: options.userId }),
      mileageApi.buildReport({ period: 'month', anchorDate: options.anchorDate, userId: options.userId }),
      mileageApi.buildReport({ period: 'year', anchorDate: options.anchorDate, userId: options.userId }),
    ]);

    return {
      day: {
        total_km: dayReport.total_km,
        compensation_rub: dayReport.compensation_rub,
        jobs_count: dayReport.jobs_count,
      },
      month: {
        total_km: monthReport.total_km,
        compensation_rub: monthReport.compensation_rub,
        jobs_count: monthReport.jobs_count,
      },
      year: {
        total_km: yearReport.total_km,
        compensation_rub: yearReport.compensation_rub,
        jobs_count: yearReport.jobs_count,
      },
    };
  },

  exportReport: async (options: {
    report: MileageReport;
    summary: MileageSummaryCards;
    format: 'xlsx' | 'csv' | 'pdf';
  }) => {
    const { report, summary, format } = options;
    const docDir = FileSystem.documentDirectory || FileSystem.cacheDirectory;
    if (!docDir) {
      throw new Error('Недоступна директория для сохранения файла');
    }

    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filePrefix = `korneo-mileage-${report.period}-${stamp}`;
    const summaryRows = [
      { Период: 'День', Км: summary.day.total_km, Компенсация_руб: summary.day.compensation_rub, Работ: summary.day.jobs_count },
      { Период: 'Месяц', Км: summary.month.total_km, Компенсация_руб: summary.month.compensation_rub, Работ: summary.month.jobs_count },
      { Период: 'Год', Км: summary.year.total_km, Компенсация_руб: summary.year.compensation_rub, Работ: summary.year.jobs_count },
    ];
    const segmentRows = report.segments.map((segment) => ({
      Сегмент: segment.index,
      Пользователь: segment.user_name,
      Откуда: segment.from_address,
      Куда: segment.to_address,
      Начало: segment.started_at,
      Конец: segment.ended_at,
      Км: segment.distance_km,
      Компенсация_руб: segment.compensation_rub,
      FromJobId: segment.from_job_id,
      ToJobId: segment.to_job_id,
    }));

    if (format === 'xlsx') {
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(summaryRows), 'Сводка');
      XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(segmentRows), 'Сегменты');
      const base64 = XLSX.write(workbook, { type: 'base64', bookType: 'xlsx' });
      const uri = `${docDir}${filePrefix}.xlsx`;
      await FileSystem.writeAsStringAsync(uri, base64, {
        encoding: FileSystem.EncodingType.Base64,
      });
      return uri;
    }

    if (format === 'csv') {
      const header = ['Сегмент', 'Пользователь', 'Откуда', 'Куда', 'Начало', 'Конец', 'Км', 'Компенсация_руб'];
      const lines = [header.map(toCsvCell).join(';')];
      for (const segment of report.segments) {
        lines.push(
          [
            segment.index,
            segment.user_name,
            segment.from_address,
            segment.to_address,
            segment.started_at,
            segment.ended_at,
            segment.distance_km,
            segment.compensation_rub,
          ]
            .map(toCsvCell)
            .join(';')
        );
      }
      const uri = `${docDir}${filePrefix}.csv`;
      await FileSystem.writeAsStringAsync(uri, lines.join('\n'), {
        encoding: FileSystem.EncodingType.UTF8,
      });
      return uri;
    }

    const rowsHtml = report.segments
      .map(
        (segment) => `
          <tr>
            <td>${segment.index}</td>
            <td>${segment.user_name}</td>
            <td>${segment.from_address}</td>
            <td>${segment.to_address}</td>
            <td>${segment.distance_km.toFixed(3)}</td>
            <td>${segment.compensation_rub.toFixed(2)}</td>
          </tr>
        `
      )
      .join('');

    const html = `
      <html>
        <head>
          <meta charset="utf-8" />
          <style>
            body { font-family: Arial, sans-serif; padding: 24px; }
            h1 { margin: 0 0 8px 0; }
            p { margin: 4px 0; }
            table { border-collapse: collapse; width: 100%; margin-top: 12px; }
            th, td { border: 1px solid #cccccc; padding: 6px; font-size: 12px; text-align: left; }
            th { background: #f0f0f0; }
          </style>
        </head>
        <body>
          <h1>Пробег: ${formatPeriodLabel(report.period)}</h1>
          <p>Пользователь: ${report.user_label}</p>
          <p>Период: ${report.period_start} — ${report.period_end}</p>
          <p>Пробег: ${report.total_km.toFixed(3)} км</p>
          <p>Компенсация: ${report.compensation_rub.toFixed(2)} руб.</p>
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Пользователь</th>
                <th>Откуда</th>
                <th>Куда</th>
                <th>Км</th>
                <th>Компенсация</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>
        </body>
      </html>
    `;

    const pdf = await Print.printToFileAsync({ html });
    const targetUri = `${docDir}${filePrefix}.pdf`;
    await FileSystem.copyAsync({ from: pdf.uri, to: targetUri });
    return targetUri;
  },
};

export const mileagePeriods: MileagePeriod[] = ['day', 'month', 'year'];
export const parseMileagePeriod = (value: string): MileagePeriod => (isPeriod(value) ? value : 'day');

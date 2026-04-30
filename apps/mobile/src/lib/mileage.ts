import * as FileSystem from 'expo-file-system';
import { jobsApi } from '@/src/lib/supabase';

export type MileagePeriod = 'day' | 'month' | 'year';

export type MileageSegment = {
  index: number;
  from_address: string;
  to_address: string;
  started_at: string;
  distance_km: number;
  compensation_rub: number;
};

export type MileageReport = {
  period: MileagePeriod;
  from: string;
  to: string;
  total_km: number;
  compensation_rub: number;
  jobs_count: number;
  segments: MileageSegment[];
  route_preview_url: string | null;
};

export type MileageSummaryCards = {
  day: { total_km: number; compensation_rub: number; jobs_count: number };
  month: { total_km: number; compensation_rub: number; jobs_count: number };
  year: { total_km: number; compensation_rub: number; jobs_count: number };
};

type BuildArgs = { period: MileagePeriod; anchorDate?: Date; userId?: string | null };

const FUEL_RATE = 17;
export const mileagePeriods: MileagePeriod[] = ['day', 'month', 'year'];

export const parseMileagePeriod = (value: unknown): MileagePeriod => {
  if (value === 'day' || value === 'month' || value === 'year') {
    return value;
  }
  return 'day';
};

const toDateKey = (date: Date) => date.toISOString().slice(0, 10);

const periodRange = (period: MileagePeriod, anchor = new Date()) => {
  const base = new Date(anchor);
  if (period === 'day') {
    const from = new Date(base.getFullYear(), base.getMonth(), base.getDate(), 0, 0, 0, 0);
    const to = new Date(base.getFullYear(), base.getMonth(), base.getDate(), 23, 59, 59, 999);
    return { from, to };
  }
  if (period === 'month') {
    const from = new Date(base.getFullYear(), base.getMonth(), 1, 0, 0, 0, 0);
    const to = new Date(base.getFullYear(), base.getMonth() + 1, 0, 23, 59, 59, 999);
    return { from, to };
  }
  const from = new Date(base.getFullYear(), 0, 1, 0, 0, 0, 0);
  const to = new Date(base.getFullYear(), 11, 31, 23, 59, 59, 999);
  return { from, to };
};

const asNum = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number(value.replace(',', '.'));
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

const haversineKm = (aLat: number, aLng: number, bLat: number, bLng: number) => {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const r = 6371;
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const aa =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(aa), Math.sqrt(1 - aa));
  return r * c;
};

const pickJobTime = (job: Record<string, any>) =>
  String(job.started_at || job.created_at || job.updated_at || '');

const pickJobAddress = (job: Record<string, any>) =>
  String(job.address || job.location || job.object_address || '').trim();

const buildPeriodReport = async ({ period, anchorDate, userId }: BuildArgs): Promise<MileageReport> => {
  const { from, to } = periodRange(period, anchorDate || new Date());
  const allJobs = (await jobsApi.getAll({ include_done: true }).catch(() => [])) as Record<string, any>[];

  const scoped = allJobs
    .filter((job) => {
      if (userId && String(job.engineer_id || '') !== String(userId)) return false;
      const ts = new Date(pickJobTime(job));
      if (Number.isNaN(ts.getTime())) return false;
      return ts >= from && ts <= to;
    })
    .sort((a, b) => new Date(pickJobTime(a)).getTime() - new Date(pickJobTime(b)).getTime());

  const segments: MileageSegment[] = [];
  for (let i = 0; i < scoped.length - 1; i += 1) {
    const current = scoped[i];
    const next = scoped[i + 1];
    const fromAddress = pickJobAddress(current);
    const toAddress = pickJobAddress(next);
    if (!fromAddress || !toAddress) continue;

    let distanceKm = asNum(next.distance_km) ?? asNum(next.km) ?? 0;
    if (distanceKm <= 0) {
      const aLat = asNum(current.lat);
      const aLng = asNum(current.lng);
      const bLat = asNum(next.lat);
      const bLng = asNum(next.lng);
      if (aLat != null && aLng != null && bLat != null && bLng != null) {
        distanceKm = haversineKm(aLat, aLng, bLat, bLng);
      }
    }

    segments.push({
      index: segments.length + 1,
      from_address: fromAddress,
      to_address: toAddress,
      started_at: pickJobTime(next),
      distance_km: Number(distanceKm.toFixed(2)),
      compensation_rub: Number((distanceKm * FUEL_RATE).toFixed(2)),
    });
  }

  const totalKm = Number(segments.reduce((sum, row) => sum + row.distance_km, 0).toFixed(2));
  return {
    period,
    from: from.toISOString(),
    to: to.toISOString(),
    total_km: totalKm,
    compensation_rub: Number((totalKm * FUEL_RATE).toFixed(2)),
    jobs_count: scoped.length,
    segments,
    route_preview_url: null,
  };
};

const toSummaryCard = (report: MileageReport) => ({
  total_km: report.total_km,
  compensation_rub: report.compensation_rub,
  jobs_count: report.jobs_count,
});

export const mileageApi = {
  buildReport: async ({ period, anchorDate = new Date(), userId = null }: BuildArgs) =>
    buildPeriodReport({ period, anchorDate, userId }),

  buildSummaryCards: async ({
    anchorDate = new Date(),
    userId = null,
  }: {
    anchorDate?: Date;
    userId?: string | null;
  }): Promise<MileageSummaryCards> => {
    const [day, month, year] = await Promise.all([
      buildPeriodReport({ period: 'day', anchorDate, userId }),
      buildPeriodReport({ period: 'month', anchorDate, userId }),
      buildPeriodReport({ period: 'year', anchorDate, userId }),
    ]);
    return {
      day: toSummaryCard(day),
      month: toSummaryCard(month),
      year: toSummaryCard(year),
    };
  },

  exportReport: async ({
    report,
    summary,
    format,
  }: {
    report: MileageReport;
    summary: MileageSummaryCards;
    format: 'xlsx' | 'pdf';
  }) => {
    const rows = [
      ['period', report.period],
      ['from', report.from],
      ['to', report.to],
      ['total_km', String(report.total_km)],
      ['compensation_rub', String(report.compensation_rub)],
      ['jobs_count', String(report.jobs_count)],
      ['day_total_km', String(summary.day.total_km)],
      ['month_total_km', String(summary.month.total_km)],
      ['year_total_km', String(summary.year.total_km)],
      ['segments', ''],
      ...report.segments.map((segment) => [
        String(segment.index),
        toDateKey(new Date(segment.started_at)),
        segment.from_address,
        segment.to_address,
        String(segment.distance_km),
        String(segment.compensation_rub),
      ]),
    ];
    const content = rows.map((row) => row.join(';')).join('\n');
    const ext = format === 'pdf' ? 'txt' : 'csv';
    const uri = `${FileSystem.cacheDirectory || FileSystem.documentDirectory}mileage-report-${Date.now()}.${ext}`;
    await FileSystem.writeAsStringAsync(uri, content, { encoding: FileSystem.EncodingType.UTF8 });
    return uri;
  },
};

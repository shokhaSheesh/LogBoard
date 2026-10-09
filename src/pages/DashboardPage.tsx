import { useState, useEffect } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar,
} from 'recharts';
import { Building2, IdCard, PackageOpen, Loader2 } from 'lucide-react';
import { api } from '@/lib/api';
import { Kpi } from '@/components/shared/Kpi';
import { KpiRow, Page } from '@/components/shared/ui';
import { PeriodFilter, weekOf, type Period } from '@/components/shared/PeriodFilter';
import { parseDate } from '@/lib/dates';

// ── API types ─────────────────────────────────────────────────────────────────

// What does not depend on the period: today's plan mix and driver headcounts.
interface DashboardSummary {
  plans: { name: string; color: string; companies: number; value: number }[];
  top_companies_by_drivers: { company: string; drivers: number }[];
}

interface PeriodMetric { value: number; prev: number; delta_pct: number | null }
type Unit = 'day' | 'week' | 'month';
interface PeriodView {
  from: string; to: string; unit: Unit;
  kpis: { companies: PeriodMetric; drivers: PeriodMetric; loads: PeriodMetric };
  buckets: { start: string; companies: number; drivers: number; loads: number }[];
  load_volume_by_company: { company: string; prev: number; curr: number }[];
}

const WEEK_START = 1; // Monday
const PINE = '#178A4C';
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const pad2 = (n: number) => String(n).padStart(2, '0');
const num = (n: number) => n.toLocaleString('en-US');

// The x-axis label of one point: the day for daily and weekly points, the month for monthly
// ones — with its year only when the series crosses into another year.
function bucketLabel(start: string, unit: Unit, manyYears: boolean): string {
  const d = parseDate(start);
  if (!d) return start;
  if (unit === 'month') return manyYears ? `${MONTHS[d.getMonth()]} ${pad2(d.getFullYear() % 100)}` : MONTHS[d.getMonth()];
  return `${pad2(d.getDate())}.${pad2(d.getMonth() + 1)}`;
}

// "+12.0%" under a KPI, followed by what it is compared with; nothing when there is no base.
function delta(m: PeriodMetric, versus: string): { note?: string; noteTone?: 'good' | 'bad' } {
  if (m.delta_pct === null || m.delta_pct === undefined) return {};
  return { note: `${m.delta_pct >= 0 ? '+' : ''}${m.delta_pct.toFixed(1)}% ${versus}`, noteTone: m.delta_pct >= 0 ? 'good' : 'bad' };
}

// ── Chart pieces ──────────────────────────────────────────────────────────────

const TIP_BASE: React.CSSProperties = {
  backgroundColor: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10,
  padding: '10px 14px', boxShadow: '0 8px 24px rgba(0,0,0,0.10)',
  fontSize: 12, lineHeight: 1.4, pointerEvents: 'none',
};
const SERIES_LABEL: Record<string, string> = { companies: 'Companies', drivers: 'Drivers', loads: 'Loads', curr: 'Loads' };

function TipRow({ color, label, value }: { color: string; label: string; value: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 2 }}>
      <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: color, flexShrink: 0, display: 'inline-block' }} />
      <span style={{ color: 'var(--muted-foreground)', flex: 1 }}>{label}</span>
      <span style={{ fontWeight: 700, color: 'var(--foreground)' }}>{value}</span>
    </div>
  );
}

function SeriesTip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const p = payload[0];
  return (
    <div style={TIP_BASE}>
      <div style={{ fontWeight: 600, color: 'var(--foreground)', marginBottom: 6 }}>{label}</div>
      <TipRow color={PINE} label={SERIES_LABEL[p.dataKey] ?? p.name} value={num(Number(p.value))} />
    </div>
  );
}

function PieTip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const p = payload[0];
  return <div style={TIP_BASE}><TipRow color={p.payload.color} label={p.name} value={`${p.value}%`} /></div>;
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, minWidth: 0 }}>
      <div style={{ padding: '12px 14px 0', fontSize: 13.5, fontWeight: 600, color: 'var(--foreground)' }}>{title}</div>
      <div style={{ padding: '12px 12px 8px' }}>{children}</div>
    </div>
  );
}

function Empty({ height, children = 'No data' }: { height: number; children?: React.ReactNode }) {
  return <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted-foreground)', fontSize: 13 }}>{children}</div>;
}

const AXIS = { fontSize: 11, fill: 'var(--muted-foreground)' };
const short = (v: number) => (v >= 1000 ? `${(v / 1000).toFixed(v >= 10000 ? 0 : 1)}k` : String(v));

function TrendArea({ data, dataKey }: { data: object[]; dataKey: 'companies' | 'drivers' }) {
  if (data.length === 0) return <Empty height={190} />;
  return (
    <ResponsiveContainer width="100%" height={190}>
      <AreaChart data={data} margin={{ top: 4, right: 16, left: -14, bottom: 0 }}>
        <defs>
          <linearGradient id={`g-${dataKey}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={PINE} stopOpacity={0.15} />
            <stop offset="95%" stopColor={PINE} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
        <XAxis dataKey="label" tick={AXIS} axisLine={false} tickLine={false} minTickGap={16} />
        {/* Totals barely move inside a short period, so the axis follows the data rather than starting at zero. */}
        <YAxis tick={AXIS} axisLine={false} tickLine={false} allowDecimals={false} tickFormatter={num} width={64} domain={['auto', 'auto']} />
        <Tooltip content={<SeriesTip />} />
        <Area type="monotone" dataKey={dataKey} stroke={PINE} strokeWidth={2} fill={`url(#g-${dataKey})`} dot={false} activeDot={{ r: 5, fill: PINE, strokeWidth: 0 }} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const [period, setPeriod]       = useState<Period>(() => weekOf(new Date(), WEEK_START));
  const [summary, setSummary]     = useState<DashboardSummary | null>(null);
  const [views, setViews]         = useState<Record<string, PeriodView>>({});
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    api.get<DashboardSummary>('/admin/dashboard').then(setSummary).catch(() => setLoadError('Failed to load dashboard. Please refresh.'));
  }, []);

  // One fetch per period, kept — going back to a period already seen is instant.
  const query = period.mode === 'all' ? '' : `?from=${period.from}&to=${period.to}`;
  const view = views[query];
  useEffect(() => {
    if (views[query]) return;
    let cancelled = false;
    api.get<PeriodView>(`/admin/dashboard/period${query}`)
      .then((v) => { if (!cancelled) { setViews((all) => ({ ...all, [query]: v })); setLoadError(''); } })
      .catch(() => { if (!cancelled) setLoadError('Failed to load dashboard. Please refresh.'); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  // While a new period loads, the last one stays on screen, dimmed.
  const [lastView, setLastView] = useState<PeriodView | null>(null);
  useEffect(() => { if (view) setLastView(view); }, [view]);
  const shown = view ?? lastView;

  const filter = <PeriodFilter value={period} onChange={setPeriod} weekStartDay={WEEK_START} />;

  if (!shown || !summary) {
    return (
      <Page>
        <div style={{ marginBottom: 14 }}>{filter}</div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, padding: '120px 0', color: loadError ? '#B91C1C' : 'var(--muted-foreground)', fontSize: 13 }}>
          {loadError || <><Loader2 size={18} className="animate-spin" /> Loading dashboard…</>}
        </div>
      </Page>
    );
  }

  const years = new Set(shown.buckets.map((b) => b.start.slice(0, 4)));
  const series = shown.buckets.map((b) => ({ ...b, label: bucketLabel(b.start, shown.unit, years.size > 1) }));
  const volume = shown.load_volume_by_company.filter((c) => c.curr > 0);
  const allTime = period.mode === 'all';

  return (
    <Page>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 14 }}>
        {filter}
        {loadError && <span style={{ fontSize: 12.5, color: '#B91C1C' }}>{loadError}</span>}
      </div>

      <div style={{ opacity: view ? 1 : 0.55, transition: 'opacity 0.15s' }}>
        <KpiRow>
          <Kpi label="Companies" value={num(shown.kpis.companies.value)} {...(allTime ? {} : delta(shown.kpis.companies, 'in this period'))} icon={<Building2 size={17} />} />
          <Kpi label="Drivers"   value={num(shown.kpis.drivers.value)}   {...(allTime ? {} : delta(shown.kpis.drivers, 'in this period'))}   icon={<IdCard size={17} />} />
          <Kpi label="Loads"     value={num(shown.kpis.loads.value)}     {...delta(shown.kpis.loads, 'vs previous')}                        icon={<PackageOpen size={17} />} />
        </KpiRow>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mb-3">
          <ChartCard title="Companies"><TrendArea data={series} dataKey="companies" /></ChartCard>
          <ChartCard title="Drivers"><TrendArea data={series} dataKey="drivers" /></ChartCard>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 mb-3">
          <div className="lg:col-span-2" style={{ minWidth: 0 }}>
            <ChartCard title="Loads booked">
              {series.length === 0 ? <Empty height={220} /> : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={series} margin={{ top: 4, right: 16, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                    <XAxis dataKey="label" tick={AXIS} axisLine={false} tickLine={false} minTickGap={16} />
                    <YAxis tick={AXIS} axisLine={false} tickLine={false} allowDecimals={false} tickFormatter={short} />
                    <Tooltip content={<SeriesTip />} cursor={{ fill: 'var(--muted)', opacity: 0.5 }} />
                    <Bar dataKey="loads" fill={PINE} radius={[4, 4, 0, 0]} maxBarSize={28} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </ChartCard>
          </div>

          <ChartCard title="Plans">
            {summary.plans.length === 0 ? <Empty height={180}>No companies yet</Empty> : (
              <>
                <ResponsiveContainer width="100%" height={170}>
                  <PieChart>
                    <Pie data={summary.plans} cx="50%" cy="50%" outerRadius={78} innerRadius={54} paddingAngle={summary.plans.length > 1 ? 4 : 0} cornerRadius={6} dataKey="value" stroke="none">
                      {summary.plans.map((p) => <Cell key={p.name} fill={p.color} />)}
                    </Pie>
                    <Tooltip content={<PieTip />} />
                  </PieChart>
                </ResponsiveContainer>
                <div style={{ padding: '6px 10px 4px', display: 'flex', flexDirection: 'column', gap: 7 }}>
                  {summary.plans.map((p) => (
                    <div key={p.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12.5, color: 'var(--foreground)' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: p.color, flexShrink: 0 }} />
                        {p.name}
                      </span>
                      <span style={{ fontWeight: 600 }}>{p.value}%</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </ChartCard>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <ChartCard title="Top companies by drivers">
            {summary.top_companies_by_drivers.length === 0 ? <Empty height={236} /> : (
              <ResponsiveContainer width="100%" height={236}>
                <BarChart data={summary.top_companies_by_drivers} layout="vertical" margin={{ top: 0, right: 20, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                  <XAxis type="number" tick={AXIS} axisLine={false} tickLine={false} allowDecimals={false} />
                  <YAxis type="category" dataKey="company" width={110} tick={AXIS} axisLine={false} tickLine={false} />
                  <Tooltip content={<SeriesTip />} cursor={{ fill: 'var(--muted)', opacity: 0.5 }} />
                  <Bar dataKey="drivers" fill={PINE} radius={[0, 4, 4, 0]} barSize={13} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartCard>

          <ChartCard title="Top companies by loads">
            {volume.length === 0 ? <Empty height={236}>No loads in this period</Empty> : (
              <ResponsiveContainer width="100%" height={236}>
                <BarChart data={volume} layout="vertical" margin={{ top: 0, right: 20, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                  <XAxis type="number" tick={AXIS} axisLine={false} tickLine={false} allowDecimals={false} tickFormatter={short} />
                  <YAxis type="category" dataKey="company" width={110} tick={AXIS} axisLine={false} tickLine={false} />
                  <Tooltip content={<SeriesTip />} cursor={{ fill: 'var(--muted)', opacity: 0.5 }} />
                  <Bar dataKey="curr" fill={PINE} radius={[0, 4, 4, 0]} barSize={13} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartCard>
        </div>
      </div>
    </Page>
  );
}

import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router';
import {
  AreaChart, Area, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar,
} from 'recharts';
import { Building2, Users, Package, TrendingUp, TrendingDown, ChevronDown, Download, Loader2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';

// ── API types ─────────────────────────────────────────────────────────────────

interface KpiStat { value: number; prev: number; delta_pct: number | null; spark: number[] }

interface DashboardSummary {
  kpis: { companies: KpiStat; drivers: KpiStat; monthly_loads: KpiStat };
  plans: { name: string; color: string; companies: number; value: number }[];
  top_companies_by_drivers: { company: string; drivers: number }[];
  load_volume_by_company: { company: string; prev: number; curr: number }[];
  generated_at: string;
}

interface SeriesMonth { name: string; month: number; companies: number; drivers: number; loads: number }
interface SeriesResponse { year: number; months: SeriesMonth[] }

// ── Chart tooltips ────────────────────────────────────────────────────────────

const TIP_BASE: React.CSSProperties = {
  backgroundColor: '#fff', border: '1px solid #E5E7EB', borderRadius: 10,
  padding: '10px 14px', boxShadow: '0 8px 24px rgba(0,0,0,0.10)',
  fontSize: 12, lineHeight: 1.4, pointerEvents: 'none',
};

function TipRow({ color, label, value }: { color: string; label: string; value: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 2 }}>
      <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: color, flexShrink: 0, display: 'inline-block' }} />
      <span style={{ color: '#6B7280', flex: 1 }}>{label}</span>
      <span style={{ fontWeight: 700, color: '#111827' }}>{value}</span>
    </div>
  );
}

const METRIC_LABEL: Record<string, string> = { companies: 'Companies', drivers: 'Drivers', loads: 'Loads', curr: 'This month', prev: 'Last month' };

function AreaTip({ active, payload, label: month }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div style={TIP_BASE}>
      <div style={{ fontWeight: 600, color: '#111827', marginBottom: 6, fontSize: 12 }}>{month}</div>
      {payload.map((p: any) => (
        <TipRow key={p.dataKey} color={p.color} label={METRIC_LABEL[p.name] ?? p.name} value={Number(p.value).toLocaleString()} />
      ))}
    </div>
  );
}

function BarTip({ active, payload, label: company }: any) {
  if (!active || !payload?.length) return null;
  const p = payload[0];
  return (
    <div style={TIP_BASE}>
      <div style={{ fontWeight: 600, color: '#111827', marginBottom: 6, fontSize: 12 }}>{company}</div>
      <TipRow color={p.fill} label={METRIC_LABEL[p.name] ?? p.name} value={Number(p.value).toLocaleString()} />
    </div>
  );
}

function PieTip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const p = payload[0];
  return (
    <div style={TIP_BASE}>
      <TipRow color={p.payload.color} label={p.name} value={`${p.value}%`} />
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function YearPicker({ value, options, onChange }: { value: string; options: string[]; onChange: (y: string) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        style={{ display: 'flex', alignItems: 'center', gap: 6, backgroundColor: 'var(--muted)', border: '1px solid var(--border)', borderRadius: 8, padding: '5px 10px', fontSize: '0.78rem', fontWeight: 500, color: 'var(--foreground)', cursor: 'pointer' }}
      >
        {value} <ChevronDown size={13} />
      </button>
      {open && (
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 10 }} onClick={() => setOpen(false)} />
          <div style={{ position: 'absolute', right: 0, top: 38, zIndex: 20, backgroundColor: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', minWidth: 88, maxHeight: 220, overflowY: 'auto' }}>
            {options.map((y) => (
              <button key={y} onClick={() => { onChange(y); setOpen(false); }}
                style={{ display: 'block', width: '100%', textAlign: 'left', padding: '7px 14px', fontSize: '0.8rem', border: 'none', cursor: 'pointer', fontWeight: y === value ? 600 : 400, color: y === value ? '#2563EB' : 'var(--foreground)', backgroundColor: y === value ? '#EFF6FF' : 'transparent' }}
                onMouseEnter={(e) => { if (y !== value) (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--muted)'; }}
                onMouseLeave={(e) => { if (y !== value) (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent'; }}
              >{y}</button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function Sparkline({ data, color }: { data: number[]; color: string }) {
  const points = data.map((v, i) => ({ v, i }));
  return (
    <ResponsiveContainer width={88} height={36}>
      <LineChart data={points} margin={{ top: 2, right: 0, left: 0, bottom: 2 }}>
        <Line type="monotone" dataKey="v" stroke={color} strokeWidth={2} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}

function DeltaBadge({ delta }: { delta: number | null }) {
  if (delta === null || delta === undefined) {
    return (
      <div className="flex items-center gap-1 rounded-full px-2.5 py-0.5" style={{ backgroundColor: 'var(--muted)', color: 'var(--muted-foreground)' }}>
        <span style={{ fontSize: '0.68rem', fontWeight: 600 }}>—</span>
      </div>
    );
  }
  const up = delta >= 0;
  return (
    <div className="flex items-center gap-1 rounded-full px-2.5 py-0.5" style={{ backgroundColor: up ? '#ECFDF5' : '#FEF2F2', color: up ? '#059669' : '#DC2626' }}>
      {up ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
      <span style={{ fontSize: '0.68rem', fontWeight: 600 }}>{up ? '+' : ''}{delta.toFixed(1)}%</span>
    </div>
  );
}

function StatCard({ label, value, delta, icon, color, bg, spark }: {
  label: string; value: number; delta: number | null;
  icon: React.ReactNode; color: string; bg: string; spark: number[];
}) {
  return (
    <div className="rounded-xl p-5 flex flex-col gap-3" style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}>
      <div className="flex items-start justify-between">
        <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: bg, color }}>{icon}</div>
        <DeltaBadge delta={delta} />
      </div>
      <div className="flex items-end justify-between">
        <div>
          <div style={{ color: 'var(--foreground)', fontSize: '1.65rem', fontWeight: 700, lineHeight: 1 }}>{value.toLocaleString()}</div>
          <div style={{ color: 'var(--muted-foreground)', fontSize: '0.78rem', marginTop: 5 }}>{label}</div>
        </div>
        <Sparkline data={spark} color={color} />
      </div>
    </div>
  );
}

function CardShell({ title, action, children }: { title: React.ReactNode; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-xl" style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}>
      <div className="flex items-center justify-between px-5 py-3.5" style={{ borderBottom: '1px solid var(--border)' }}>
        <div>{title}</div>
        {action && <div>{action}</div>}
      </div>
      {children}
    </div>
  );
}

const CardTitle = ({ children }: { children: React.ReactNode }) => (
  <span style={{ fontSize: '0.87rem', fontWeight: 600, color: 'var(--foreground)' }}>{children}</span>
);

function PieLabel({ cx, cy, midAngle, innerRadius, outerRadius, percent }: {
  cx: number; cy: number; midAngle: number; innerRadius: number; outerRadius: number; percent: number; name: string;
}) {
  const R = Math.PI / 180;
  const r = innerRadius + (outerRadius - innerRadius) * 0.55;
  const x = cx + r * Math.cos(-midAngle * R);
  const y = cy + r * Math.sin(-midAngle * R);
  return percent > 0.08 ? (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" style={{ fontSize: 11, fontWeight: 600 }}>
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  ) : null;
}

function ChartLoader() {
  return (
    <div style={{ height: 190, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted-foreground)' }}>
      <Loader2 size={18} className="animate-spin" />
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { can } = useAuth();
  const [summary, setSummary]     = useState<DashboardSummary | null>(null);
  const [years, setYears]         = useState<string[]>([]);
  const [seriesCache, setSeries]  = useState<Record<string, SeriesMonth[]>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [exporting, setExporting] = useState(false);

  const [companyYear, setCompanyYear] = useState('');
  const [driverYear,  setDriverYear]  = useState('');
  const [loadsYear,   setLoadsYear]   = useState('');

  // Fetch a year's series once, cache it
  const loadSeries = useCallback(async (year: string) => {
    if (!year) return;
    setSeries(prev => {
      if (prev[year]) return prev;              // already cached
      api.get<SeriesResponse>(`/admin/dashboard/series?year=${year}`)
        .then(res => setSeries(p => ({ ...p, [year]: res.months ?? [] })))
        .catch(() => setSeries(p => ({ ...p, [year]: [] })));
      return prev;
    });
  }, []);

  // Initial load: summary + years
  useEffect(() => {
    (async () => {
      setIsLoading(true);
      setLoadError('');
      try {
        const [sum, yrs] = await Promise.all([
          api.get<DashboardSummary>('/admin/dashboard'),
          api.get<number[]>('/admin/dashboard/years'),
        ]);
        setSummary(sum);
        const yearStrs = (yrs ?? []).map(String).sort();
        setYears(yearStrs);
        const current = yearStrs[yearStrs.length - 1] ?? String(new Date().getFullYear());
        setCompanyYear(current);
        setDriverYear(current);
        setLoadsYear(current);
      } catch {
        setLoadError('Failed to load dashboard. Please refresh.');
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  // Ensure each selected year's series is loaded
  useEffect(() => { loadSeries(companyYear); }, [companyYear, loadSeries]);
  useEffect(() => { loadSeries(driverYear);  }, [driverYear, loadSeries]);
  useEffect(() => { loadSeries(loadsYear);   }, [loadsYear, loadSeries]);

  async function handleExport(year: string) {
    setExporting(true);
    try {
      const blob = await api.getBlob(`/admin/dashboard/export?year=${year}`);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `dashboard-${year}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      // silent — button re-enables
    } finally {
      setExporting(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex-1 overflow-y-auto p-6" style={{ backgroundColor: 'var(--background)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, padding: '120px 0', color: 'var(--muted-foreground)', fontSize: '0.85rem' }}>
          <Loader2 size={20} className="animate-spin" /> Loading dashboard…
        </div>
      </div>
    );
  }

  if (loadError || !summary) {
    return (
      <div className="flex-1 overflow-y-auto p-6" style={{ backgroundColor: 'var(--background)' }}>
        <div style={{ textAlign: 'center', padding: '120px 0', color: '#B91C1C', fontSize: '0.85rem' }}>{loadError || 'No data.'}</div>
      </div>
    );
  }

  const { kpis, plans, top_companies_by_drivers, load_volume_by_company } = summary;

  // Donut data: value is the percentage share (already computed by backend)
  const planData = plans.map(p => ({ name: p.name, value: p.value, color: p.color }));

  return (
    <div className="flex-1 overflow-y-auto p-6" style={{ backgroundColor: 'var(--background)' }}>

      {/* ── Header ──────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 style={{ color: 'var(--foreground)', fontSize: '1.3rem', fontWeight: 700, lineHeight: 1.2 }}>Super Admin Dashboard</h1>
          <p style={{ color: 'var(--muted-foreground)', fontSize: '0.83rem', marginTop: 3 }}>Overview of your SaaS ecosystem</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={() => handleExport(loadsYear || companyYear)}
            disabled={exporting}
            style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '8px 16px', borderRadius: 8, cursor: exporting ? 'not-allowed' : 'pointer', fontSize: '0.82rem', fontWeight: 500, color: 'var(--foreground)', backgroundColor: 'var(--card)', border: '1px solid var(--border)', opacity: exporting ? 0.6 : 1 }}
            onMouseEnter={(e) => { if (!exporting) e.currentTarget.style.backgroundColor = 'var(--muted)'; }}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'var(--card)')}
          >
            {exporting ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />} Export Data
          </button>
          {can('companies.create') && (
            <Link
              to="/admin/companies"
              style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '8px 16px', borderRadius: 8, cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600, color: '#fff', border: 'none', textDecoration: 'none', background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)' }}
            >
              + Add Company
            </Link>
          )}
        </div>
      </div>

      {/* ── Row 1: Stat Cards ───────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-5">
        <StatCard label="Total Companies"     value={kpis.companies.value}     delta={kpis.companies.delta_pct}     icon={<Building2 size={20} />} color="#2563EB" bg="#EFF6FF" spark={kpis.companies.spark} />
        <StatCard label="Total Drivers"       value={kpis.drivers.value}       delta={kpis.drivers.delta_pct}       icon={<Users size={20} />}     color="#8B5CF6" bg="#F5F3FF" spark={kpis.drivers.spark} />
        <StatCard label="Total Monthly Loads" value={kpis.monthly_loads.value} delta={kpis.monthly_loads.delta_pct} icon={<Package size={20} />}   color="#10B981" bg="#ECFDF5" spark={kpis.monthly_loads.spark} />
      </div>

      {/* ── Row 2: Companies Growth + Drivers Growth ────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">

        <CardShell title={<CardTitle>Companies Growth</CardTitle>} action={<YearPicker value={companyYear} options={years} onChange={setCompanyYear} />}>
          <div style={{ padding: '16px 12px 8px' }}>
            {!seriesCache[companyYear] ? <ChartLoader /> : (
              <ResponsiveContainer width="100%" height={190}>
                <AreaChart data={seriesCache[companyYear]} margin={{ top: 4, right: 16, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gc" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2563EB" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#2563EB" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
                  <Tooltip content={<AreaTip />} />
                  <Area type="monotone" dataKey="companies" stroke="#2563EB" strokeWidth={2.5} fill="url(#gc)" dot={false} activeDot={{ r: 5, fill: '#2563EB', strokeWidth: 0 }} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </CardShell>

        <CardShell title={<CardTitle>Drivers Growth</CardTitle>} action={<YearPicker value={driverYear} options={years} onChange={setDriverYear} />}>
          <div style={{ padding: '16px 12px 8px' }}>
            {!seriesCache[driverYear] ? <ChartLoader /> : (
              <ResponsiveContainer width="100%" height={190}>
                <AreaChart data={seriesCache[driverYear]} margin={{ top: 4, right: 16, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gd" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
                  <Tooltip content={<AreaTip />} />
                  <Area type="monotone" dataKey="drivers" stroke="#8B5CF6" strokeWidth={2.5} fill="url(#gd)" dot={false} activeDot={{ r: 5, fill: '#8B5CF6', strokeWidth: 0 }} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </CardShell>
      </div>

      {/* ── Row 3: Monthly Loads Volume + Subscription Plans ────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-5">

        <div className="lg:col-span-2">
          <CardShell title={<CardTitle>Monthly Loads Volume</CardTitle>} action={<YearPicker value={loadsYear} options={years} onChange={setLoadsYear} />}>
            <div style={{ padding: '16px 12px 8px' }}>
              {!seriesCache[loadsYear] ? <div style={{ height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted-foreground)' }}><Loader2 size={18} className="animate-spin" /></div> : (
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={seriesCache[loadsYear]} margin={{ top: 4, right: 16, left: -10, bottom: 0 }}>
                    <defs>
                      <linearGradient id="gl" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10B981" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)} />
                    <Tooltip content={<AreaTip />} />
                    <Area type="monotone" dataKey="loads" stroke="#10B981" strokeWidth={2.5} fill="url(#gl)" dot={false} activeDot={{ r: 5, fill: '#10B981', strokeWidth: 0 }} />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardShell>
        </div>

        <CardShell title={<CardTitle>Subscription Plans</CardTitle>}>
          <div style={{ padding: '16px 0 12px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            {planData.length === 0 ? (
              <div style={{ height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted-foreground)', fontSize: '0.8rem' }}>No companies yet</div>
            ) : (
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie data={planData} cx="50%" cy="50%" outerRadius={78} innerRadius={40} dataKey="value" labelLine={false} label={PieLabel as any} strokeWidth={0}>
                    {planData.map((e) => <Cell key={e.name} fill={e.color} />)}
                  </Pie>
                  <Tooltip content={<PieTip />} />
                </PieChart>
              </ResponsiveContainer>
            )}
            <div style={{ width: '100%', padding: '4px 24px 0', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {planData.map((p) => (
                <div key={p.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: p.color, flexShrink: 0, display: 'inline-block' }} />
                    <span style={{ fontSize: '0.78rem', color: 'var(--foreground)' }}>{p.name}</span>
                  </div>
                  <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--foreground)' }}>{p.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </CardShell>
      </div>

      {/* ── Row 4: Top Companies by Drivers + Load Volume by Company ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        <CardShell title={<CardTitle>Top Companies by Driver Count</CardTitle>}>
          <div style={{ padding: '12px 16px 12px' }}>
            {top_companies_by_drivers.length === 0 ? (
              <div style={{ height: 236, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted-foreground)', fontSize: '0.8rem' }}>No data</div>
            ) : (
              <ResponsiveContainer width="100%" height={236}>
                <BarChart data={top_companies_by_drivers} layout="vertical" margin={{ top: 0, right: 20, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="company" width={80} tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
                  <Tooltip content={<BarTip />} cursor={{ fill: 'var(--muted)', opacity: 0.5 }} />
                  <Bar dataKey="drivers" fill="#8B5CF6" radius={[0, 4, 4, 0]} barSize={13} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </CardShell>

        <CardShell title={<CardTitle>Load Volume by Company</CardTitle>}>
          <div style={{ padding: '12px 16px 12px' }}>
            {load_volume_by_company.length === 0 ? (
              <div style={{ height: 236, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted-foreground)', fontSize: '0.8rem' }}>No data</div>
            ) : (
              <ResponsiveContainer width="100%" height={236}>
                <BarChart data={load_volume_by_company} margin={{ top: 4, right: 8, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="company" tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)} />
                  <Tooltip content={<BarTip />} cursor={{ fill: 'var(--muted)', opacity: 0.5 }} />
                  <Bar dataKey="curr" fill="#2563EB" radius={[3, 3, 0, 0]} barSize={22} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </CardShell>

      </div>
    </div>
  );
}

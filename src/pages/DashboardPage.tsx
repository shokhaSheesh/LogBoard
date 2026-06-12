import { useState } from 'react';
import {
  AreaChart, Area, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar,
} from 'recharts';
import { Building2, Users, Package, TrendingUp, ChevronDown, Download } from 'lucide-react';

// ── Data ──────────────────────────────────────────────────────────────────────

const monthlyTrend: Record<string, { name: string; companies: number; drivers: number }[]> = {
  '2024': [
    { name: 'Jan', companies: 210, drivers: 1400 }, { name: 'Feb', companies: 240, drivers: 1550 },
    { name: 'Mar', companies: 265, drivers: 1700 }, { name: 'Apr', companies: 280, drivers: 1900 },
    { name: 'May', companies: 310, drivers: 2100 }, { name: 'Jun', companies: 345, drivers: 2300 },
    { name: 'Jul', companies: 360, drivers: 2500 }, { name: 'Aug', companies: 390, drivers: 2700 },
    { name: 'Sep', companies: 420, drivers: 2900 }, { name: 'Oct', companies: 455, drivers: 3100 },
    { name: 'Nov', companies: 480, drivers: 3300 }, { name: 'Dec', companies: 512, drivers: 3520 },
  ],
  '2025': [
    { name: 'Jan', companies: 530, drivers: 3700 }, { name: 'Feb', companies: 565, drivers: 3950 },
    { name: 'Mar', companies: 590, drivers: 4200 }, { name: 'Apr', companies: 620, drivers: 4500 },
    { name: 'May', companies: 660, drivers: 4800 }, { name: 'Jun', companies: 700, drivers: 5100 },
    { name: 'Jul', companies: 742, drivers: 5400 }, { name: 'Aug', companies: 780, drivers: 5700 },
    { name: 'Sep', companies: 815, drivers: 6000 }, { name: 'Oct', companies: 850, drivers: 6350 },
    { name: 'Nov', companies: 890, drivers: 6700 }, { name: 'Dec', companies: 930, drivers: 7050 },
  ],
  '2026': [
    { name: 'Jan', companies: 380, drivers: 1050 }, { name: 'Feb', companies: 396, drivers: 1085 },
    { name: 'Mar', companies: 412, drivers: 1120 }, { name: 'Apr', companies: 428, drivers: 1155 },
    { name: 'May', companies: 445, drivers: 1180 }, { name: 'Jun', companies: 462, drivers: 1200 },
  ],
};

const monthlyLoads: Record<string, { name: string; loads: number }[]> = {
  '2024': [
    { name: 'Jan', loads: 8200  }, { name: 'Feb', loads: 9100  }, { name: 'Mar', loads: 10400 },
    { name: 'Apr', loads: 11800 }, { name: 'May', loads: 13200 }, { name: 'Jun', loads: 14600 },
    { name: 'Jul', loads: 15900 }, { name: 'Aug', loads: 17300 }, { name: 'Sep', loads: 18700 },
    { name: 'Oct', loads: 20100 }, { name: 'Nov', loads: 21500 }, { name: 'Dec', loads: 23000 },
  ],
  '2025': [
    { name: 'Jan', loads: 24200 }, { name: 'Feb', loads: 25800 }, { name: 'Mar', loads: 27500 },
    { name: 'Apr', loads: 29400 }, { name: 'May', loads: 31200 }, { name: 'Jun', loads: 33100 },
    { name: 'Jul', loads: 35000 }, { name: 'Aug', loads: 36900 }, { name: 'Sep', loads: 38800 },
    { name: 'Oct', loads: 40800 }, { name: 'Nov', loads: 42900 }, { name: 'Dec', loads: 45000 },
  ],
  '2026': [
    { name: 'Jan', loads: 12800 }, { name: 'Feb', loads: 13500 }, { name: 'Mar', loads: 14200 },
    { name: 'Apr', loads: 14800 }, { name: 'May', loads: 15100 }, { name: 'Jun', loads: 15400 },
  ],
};

const sparkCompanies = [210, 265, 310, 360, 420, 462].map((v, i) => ({ v, i }));
const sparkDrivers   = [1400, 1700, 2100, 2500, 2900, 1200].map((v, i) => ({ v, i }));
const sparkLoads     = [8200, 10400, 13200, 15900, 18700, 15400].map((v, i) => ({ v, i }));

const driversPerCompany = [
  { company: 'Acme Corp',  drivers: 412 },
  { company: 'Helios Sys', drivers: 387 },
  { company: 'Orbital',    drivers: 340 },
  { company: 'Zenith',     drivers: 298 },
  { company: 'Nova Net',   drivers: 264 },
  { company: 'Apex Frt',   drivers: 231 },
  { company: 'Crestline',  drivers: 198 },
  { company: 'Summit',     drivers: 175 },
];

const loadsPerCompany = [
  { company: 'Acme',    prev: 10200, curr: 12400 },
  { company: 'Helios',  prev: 9100,  curr: 10850 },
  { company: 'Orbital', prev: 7800,  curr: 9200  },
  { company: 'Zenith',  prev: 7000,  curr: 8100  },
  { company: 'Nova',    prev: 6100,  curr: 7300  },
  { company: 'Apex',    prev: 5300,  curr: 6200  },
  { company: 'Crest',   prev: 4200,  curr: 5100  },
  { company: 'Summit',  prev: 3600,  curr: 4300  },
];

const subscriptionPlans = [
  { name: 'Enterprise',   value: 38, color: '#2563EB' },
  { name: 'Professional', value: 29, color: '#8B5CF6' },
  { name: 'Starter',      value: 22, color: '#10B981' },
  { name: 'Basic',        value: 11, color: '#F59E0B' },
];

const YEARS = ['2024', '2025', '2026'];

const TOOLTIP_STYLE = {
  backgroundColor: 'var(--card)',
  border: '1px solid var(--border)',
  borderRadius: 8,
  fontSize: 12,
  boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
};

// ── Sub-components ────────────────────────────────────────────────────────────

function YearPicker({ value, onChange }: { value: string; onChange: (y: string) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          backgroundColor: 'var(--muted)', border: '1px solid var(--border)',
          borderRadius: 8, padding: '5px 10px',
          fontSize: '0.78rem', fontWeight: 500, color: 'var(--foreground)', cursor: 'pointer',
        }}
      >
        {value} <ChevronDown size={13} />
      </button>
      {open && (
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 10 }} onClick={() => setOpen(false)} />
          <div style={{
            position: 'absolute', right: 0, top: 38, zIndex: 20,
            backgroundColor: 'var(--card)', border: '1px solid var(--border)',
            borderRadius: 8, overflow: 'hidden', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', minWidth: 88,
          }}>
            {YEARS.map((y) => (
              <button
                key={y}
                onClick={() => { onChange(y); setOpen(false); }}
                style={{
                  display: 'block', width: '100%', textAlign: 'left',
                  padding: '7px 14px', fontSize: '0.8rem', border: 'none', cursor: 'pointer',
                  fontWeight: y === value ? 600 : 400,
                  color: y === value ? 'var(--primary)' : 'var(--foreground)',
                  backgroundColor: y === value ? 'var(--accent)' : 'transparent',
                }}
                onMouseEnter={(e) => { if (y !== value) (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--muted)'; }}
                onMouseLeave={(e) => { if (y !== value) (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent'; }}
              >
                {y}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function Sparkline({ data, color }: { data: { v: number; i: number }[]; color: string }) {
  return (
    <ResponsiveContainer width={88} height={36}>
      <LineChart data={data} margin={{ top: 2, right: 0, left: 0, bottom: 2 }}>
        <Line type="monotone" dataKey="v" stroke={color} strokeWidth={2} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}

function StatCard({ label, value, change, icon, color, bg, spark }: {
  label: string; value: string; change: string;
  icon: React.ReactNode; color: string; bg: string;
  spark: { v: number; i: number }[];
}) {
  return (
    <div
      className="rounded-xl p-5 flex flex-col gap-3"
      style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}
    >
      <div className="flex items-start justify-between">
        <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: bg, color }}>
          {icon}
        </div>
        <div className="flex items-center gap-1 rounded-full px-2.5 py-0.5" style={{ backgroundColor: '#ECFDF5', color: '#059669' }}>
          <TrendingUp size={11} />
          <span style={{ fontSize: '0.68rem', fontWeight: 600 }}>{change}</span>
        </div>
      </div>
      <div className="flex items-end justify-between">
        <div>
          <div style={{ color: 'var(--foreground)', fontSize: '1.65rem', fontWeight: 700, lineHeight: 1 }}>{value}</div>
          <div style={{ color: 'var(--muted-foreground)', fontSize: '0.78rem', marginTop: 5 }}>{label}</div>
        </div>
        <Sparkline data={spark} color={color} />
      </div>
    </div>
  );
}

function CardShell({ title, action, children }: {
  title: React.ReactNode; action?: React.ReactNode; children: React.ReactNode;
}) {
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
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central"
      style={{ fontSize: 11, fontWeight: 600 }}>
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  ) : null;
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const [companyYear, setCompanyYear] = useState('2026');
  const [driverYear,  setDriverYear]  = useState('2026');
  const [loadsYear,   setLoadsYear]   = useState('2026');

  return (
    <div className="flex-1 overflow-y-auto p-6" style={{ backgroundColor: 'var(--background)' }}>

      {/* ── Header ──────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 style={{ color: 'var(--foreground)', fontSize: '1.3rem', fontWeight: 700, lineHeight: 1.2 }}>
            Super Admin Dashboard
          </h1>
          <p style={{ color: 'var(--muted-foreground)', fontSize: '0.83rem', marginTop: 3 }}>
            Overview of your SaaS ecosystem
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            style={{
              display: 'flex', alignItems: 'center', gap: 7,
              padding: '8px 16px', borderRadius: 8, cursor: 'pointer',
              fontSize: '0.82rem', fontWeight: 500,
              color: 'var(--foreground)', backgroundColor: 'var(--card)',
              border: '1px solid var(--border)',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--muted)')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'var(--card)')}
          >
            <Download size={15} /> Export Data
          </button>
          <button
            style={{
              display: 'flex', alignItems: 'center', gap: 7,
              padding: '8px 16px', borderRadius: 8, cursor: 'pointer',
              fontSize: '0.82rem', fontWeight: 600, color: '#fff', border: 'none',
              background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)',
            }}
          >
            + Add Company
          </button>
        </div>
      </div>

      {/* ── Row 1: Stat Cards ───────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-5">
        <StatCard label="Total Companies"    value="462"    change="+5.2%" icon={<Building2 size={20} />} color="#2563EB" bg="#EFF6FF" spark={sparkCompanies} />
        <StatCard label="Total Drivers"      value="1,200"  change="+2.1%" icon={<Users size={20} />}     color="#8B5CF6" bg="#F5F3FF" spark={sparkDrivers} />
        <StatCard label="Total Monthly Loads" value="15,400" change="+8.9%" icon={<Package size={20} />}   color="#10B981" bg="#ECFDF5" spark={sparkLoads} />
      </div>

      {/* ── Row 2: Companies growth + Drivers growth + Subscription pie ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-5">

        {/* Companies Growth */}
        <CardShell
          title={<CardTitle>Companies Growth</CardTitle>}
          action={<YearPicker value={companyYear} onChange={setCompanyYear} />}
        >
          <div style={{ padding: '16px 12px 8px' }}>
            <ResponsiveContainer width="100%" height={190}>
              <AreaChart data={monthlyTrend[companyYear]} margin={{ top: 4, right: 16, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="gc" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#2563EB" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#2563EB" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: number) => [v.toLocaleString(), 'Companies']} />
                <Area type="monotone" dataKey="companies" stroke="#2563EB" strokeWidth={2.5} fill="url(#gc)" dot={false} activeDot={{ r: 5, fill: '#2563EB', strokeWidth: 0 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardShell>

        {/* Drivers Growth */}
        <CardShell
          title={<CardTitle>Drivers Growth</CardTitle>}
          action={<YearPicker value={driverYear} onChange={setDriverYear} />}
        >
          <div style={{ padding: '16px 12px 8px' }}>
            <ResponsiveContainer width="100%" height={190}>
              <AreaChart data={monthlyTrend[driverYear]} margin={{ top: 4, right: 16, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="gd" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#8B5CF6" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: number) => [v.toLocaleString(), 'Drivers']} />
                <Area type="monotone" dataKey="drivers" stroke="#8B5CF6" strokeWidth={2.5} fill="url(#gd)" dot={false} activeDot={{ r: 5, fill: '#8B5CF6', strokeWidth: 0 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardShell>

        {/* Subscription doughnut */}
        <CardShell title={<CardTitle>Subscription Plans</CardTitle>}>
          <div style={{ padding: '16px 0 12px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <ResponsiveContainer width="100%" height={170}>
              <PieChart>
                <Pie
                  data={subscriptionPlans} cx="50%" cy="50%"
                  outerRadius={75} innerRadius={38}
                  dataKey="value" labelLine={false}
                  label={PieLabel as any} strokeWidth={0}
                >
                  {subscriptionPlans.map((e) => <Cell key={e.name} fill={e.color} />)}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div style={{ width: '100%', padding: '4px 24px 0', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {subscriptionPlans.map((p) => (
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

      {/* ── Row 3: Monthly Loads ─────────────────────────────────────── */}
      <div className="mb-5">
        <CardShell
          title={<CardTitle>Monthly Loads Volume</CardTitle>}
          action={<YearPicker value={loadsYear} onChange={setLoadsYear} />}
        >
          <div style={{ padding: '16px 12px 8px' }}>
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={monthlyLoads[loadsYear]} margin={{ top: 4, right: 16, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="gl" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#10B981" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
                <YAxis
                  tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false}
                  tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)}
                />
                <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: number) => [v.toLocaleString(), 'Loads']} />
                <Area type="monotone" dataKey="loads" stroke="#10B981" strokeWidth={2.5} fill="url(#gl)" dot={false} activeDot={{ r: 5, fill: '#10B981', strokeWidth: 0 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardShell>
      </div>

      {/* ── Row 4: Bottom — Drivers per Company + Loads prev vs curr ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        <CardShell title={<CardTitle>Top Companies by Driver Count</CardTitle>}>
          <div style={{ padding: '12px 16px 12px' }}>
            <ResponsiveContainer width="100%" height={236}>
              <BarChart data={driversPerCompany} layout="vertical" margin={{ top: 0, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="company" width={72} tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
                <Bar dataKey="drivers" fill="#8B5CF6" radius={[0, 4, 4, 0]} barSize={13} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardShell>

        <CardShell title={<CardTitle>Load Volume by Company</CardTitle>}>
          <div style={{ padding: '12px 16px 12px' }}>
            <ResponsiveContainer width="100%" height={236}>
              <BarChart data={loadsPerCompany} margin={{ top: 4, right: 8, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="company" tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
                <YAxis
                  tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false}
                  tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                />
                <Bar dataKey="curr" fill="#2563EB" radius={[3, 3, 0, 0]} barSize={22} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardShell>

      </div>
    </div>
  );
}

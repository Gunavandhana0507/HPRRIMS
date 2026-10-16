import { Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Link } from 'react-router-dom';
import { useApi } from '../lib/useApi';
import { Card, EmptyState, ErrorState, Spinner, StatCard } from '../components/ui';
import { PageHeader } from '../components/domain';
import { fmtPct, titleCase } from '../lib/format';

const COLORS = { ADMITTED: '#0F766E', DISCHARGED: '#94A3B8', AVAILABLE: '#1E7A3C', OCCUPIED: '#0F766E', MAINTENANCE: '#A3A8B4',
  LOW: '#1E7A3C', MEDIUM: '#A35F06', HIGH: '#B42318', CRITICAL: '#7A1A12' };
const axis = { fontSize: 12, fill: '#5F6B82' };

function ChartCard({ title, empty, children, height = 260 }) {
  return (
    <Card title={title}>
      {empty ? <EmptyState title="No data yet">Values will appear once records exist in the database.</EmptyState>
        : <div style={{ height }}><ResponsiveContainer width="100%" height="100%">{children}</ResponsiveContainer></div>}
    </Card>
  );
}

function Donut({ data }) {
  return (
    <PieChart>
      <Pie data={data.map((d) => ({ ...d, label: titleCase(d.name) }))} dataKey="value" nameKey="label" innerRadius={55} outerRadius={90} paddingAngle={2} stroke="none">
        {data.map((d) => <Cell key={d.name} fill={COLORS[d.name] || '#3D4A66'} />)}
      </Pie>
      <Tooltip />
      <Legend wrapperStyle={{ fontSize: 13 }} />
    </PieChart>
  );
}

const sum = (list) => (list || []).reduce((a, b) => a + b.value, 0);

export default function AdminDashboard() {
  const { data: d, loading, error, reload } = useApi('/dashboard/admin');
  if (loading && !d) return <Spinner label="Loading hospital statistics" />;
  if (error) return <ErrorState message={error} onRetry={reload} />;

  const monthly = d.monthly.map((m) => ({ ...m, period: m.period }));
  return (
    <>
      <PageHeader title="Hospital overview" description="Live counts from the HPRRIMS database. Readmission rate is readmissions as a share of all admissions." />
      <section aria-label="Admissions" className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <StatCard label="Registered patients" value={d.totalPatients} />
        <StatCard label="Total admissions" value={d.totalAdmissions} />
        <StatCard label="Active admissions" value={d.activeAdmissions} tone="brand" />
        <StatCard label="Discharged" value={d.dischargedAdmissions} />
        <StatCard label="Readmissions" value={d.totalReadmissions} tone={d.totalReadmissions ? 'warn' : undefined} />
        <StatCard label="Readmission rate" value={fmtPct(d.readmissionRate)} tone={d.readmissionRate > 15 ? 'warn' : undefined} />
      </section>
      <section aria-label="ICU" className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="ICU beds" value={d.totalIcuBeds} hint={d.maintenanceIcuBeds ? `${d.maintenanceIcuBeds} in maintenance` : undefined} />
        <StatCard label="Available ICU beds" value={d.availableIcuBeds} tone={d.availableIcuBeds ? 'ok' : 'bad'} />
        <StatCard label="Occupied ICU beds" value={d.occupiedIcuBeds} />
        <StatCard label="Pending ICU requests" value={d.pendingIcuRequests} tone={d.pendingIcuRequests ? 'warn' : undefined}
          hint={d.pendingIcuRequests ? <Link to="/icu" className="font-semibold text-brand-700 hover:underline">Review requests</Link> : undefined} />
      </section>

      <div className="mt-6 grid gap-4 xl:grid-cols-2">
        <ChartCard title="Admissions per month (last 12 months)" empty={!sum(monthly.map((m) => ({ value: m.admissions })))}>
          <BarChart data={monthly} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
            <CartesianGrid stroke="#E2E0D9" vertical={false} />
            <XAxis dataKey="period" tick={axis} tickLine={false} axisLine={false} />
            <YAxis allowDecimals={false} tick={axis} tickLine={false} axisLine={false} />
            <Tooltip cursor={{ fill: '#EEEDE8' }} />
            <Bar dataKey="admissions" name="Admissions" fill="#0F766E" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ChartCard>
        <ChartCard title="Readmissions per month" empty={!sum(monthly.map((m) => ({ value: m.admissions })))}>
          <LineChart data={monthly} margin={{ top: 8, right: 12, left: -18, bottom: 0 }}>
            <CartesianGrid stroke="#E2E0D9" vertical={false} />
            <XAxis dataKey="period" tick={axis} tickLine={false} axisLine={false} />
            <YAxis allowDecimals={false} tick={axis} tickLine={false} axisLine={false} />
            <Tooltip />
            <Line type="monotone" dataKey="readmissions" name="Readmissions" stroke="#A35F06" strokeWidth={2} dot={{ r: 3 }} />
          </LineChart>
        </ChartCard>
        <ChartCard title="Admission status" empty={!sum(d.statusDistribution)}><Donut data={d.statusDistribution} /></ChartCard>
        <ChartCard title="ICU bed utilisation" empty={!sum(d.icuUtilization)}><Donut data={d.icuUtilization} /></ChartCard>
        <ChartCard title={`Readmission risk of saved predictions (${d.totalPredictions})`} empty={!sum(d.riskDistribution)}><Donut data={d.riskDistribution} /></ChartCard>
        <ChartCard title="Advisory ICU priority of requests" empty={!sum(d.icuPriorityDistribution)}><Donut data={d.icuPriorityDistribution} /></ChartCard>
      </div>
    </>
  );
}

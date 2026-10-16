import { Link } from 'react-router-dom';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { FilePlus2 } from 'lucide-react';
import { useApi } from '../lib/useApi';
import { useAuth } from '../auth/AuthContext';
import { Card, EmptyState, ErrorState, Spinner, StatCard } from '../components/ui';
import { DataTable } from '../components/DataTable';
import { PageHeader, PatientLink, ReadmissionFlag, RiskIndicator } from '../components/domain';
import { fmtDateTime, titleCase } from '../lib/format';

const RISK_COLORS = { LOW: '#1E7A3C', MEDIUM: '#A35F06', HIGH: '#B42318' };

export default function DoctorDashboard() {
  const { user } = useAuth();
  const { data: d, loading, error, reload } = useApi('/dashboard/doctor');
  if (loading && !d) return <Spinner label="Loading your patients" />;
  if (error) return <ErrorState message={error} onRetry={reload} />;
  const riskTotal = d.riskDistribution.reduce((a, b) => a + b.value, 0);

  return (
    <>
      <PageHeader title={`Good to see you, ${user.fullName}`} description="Patients currently admitted under your care, your latest notes, and saved readmission risk predictions." />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="Assigned active admissions" value={d.assignedActiveCount} tone="brand" />
        <StatCard label="Recent record entries" value={d.recentRecords.length} />
        <StatCard label="Saved predictions (recent)" value={d.recentPredictions.length} />
        <StatCard label="High-risk predictions" value={d.riskDistribution.find((r) => r.name === 'HIGH')?.value ?? 0} tone="bad" />
      </div>

      <Card title="Assigned active admissions" className="mt-6" bodyClassName="p-0">
        <DataTable
          caption="Assigned active admissions"
          rows={d.assignedActiveAdmissions}
          empty={<EmptyState title="No active admissions are assigned to you">New admissions assigned by hospital staff will appear here.</EmptyState>}
          columns={[
            { key: 'patient', header: 'Patient', render: (a) => <PatientLink id={a.patientId} code={a.patientCode} name={a.patientName} /> },
            { key: 'reason', header: 'Reason', hideBelow: 'md' },
            { key: 'admittedAt', header: 'Admitted', render: (a) => fmtDateTime(a.admittedAt), hideBelow: 'sm' },
            { key: 'readm', header: 'Flag', render: (a) => <ReadmissionFlag admission={a} compact /> },
            { key: 'act', header: <span className="sr-only">Actions</span>, render: (a) => (
              <Link to={`/admissions/${a.id}/records`} className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700 hover:underline">
                <FilePlus2 className="h-4 w-4" aria-hidden />Records
              </Link>
            ) },
          ]}
        />
      </Card>

      <div className="mt-6 grid gap-4 xl:grid-cols-[1fr_22rem]">
        <Card title="Recent readmission risk predictions" bodyClassName="p-0">
          <DataTable
            caption="Recent predictions"
            rows={d.recentPredictions}
            empty={<EmptyState title="No predictions yet">Predictions are saved when your patients are discharged.</EmptyState>}
            columns={[
              { key: 'patient', header: 'Patient', render: (p) => <PatientLink id={p.patientId} code={p.patientCode} name={p.patientName} /> },
              { key: 'risk', header: 'Risk', render: (p) => <RiskIndicator probability={p.probability} level={p.riskLevel} /> },
              { key: 'createdAt', header: 'Saved', render: (p) => fmtDateTime(p.createdAt), hideBelow: 'lg' },
            ]}
          />
        </Card>
        <Card title="Risk distribution">
          {riskTotal ? (
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={d.riskDistribution.map((r) => ({ ...r, label: titleCase(r.name) }))} dataKey="value" nameKey="label" innerRadius={45} outerRadius={80} stroke="none">
                    {d.riskDistribution.map((r) => <Cell key={r.name} fill={RISK_COLORS[r.name]} />)}
                  </Pie>
                  <Tooltip /><Legend wrapperStyle={{ fontSize: 13 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : <EmptyState title="No predictions to chart" />}
        </Card>
      </div>

      <Card title="Your recent medical record entries" className="mt-6" bodyClassName="p-0">
        <DataTable
          caption="Recent record entries"
          rows={d.recentRecords}
          empty={<EmptyState title="You have not added any records yet" />}
          columns={[
            { key: 'patient', header: 'Patient', render: (r) => <PatientLink id={r.patientId} code={r.patientCode} name={r.patientName} /> },
            { key: 'diagnosis', header: 'Diagnosis / note', render: (r) => <span className="line-clamp-2">{r.diagnosis || r.treatmentNotes || r.prescription}</span> },
            { key: 'createdAt', header: 'Written', render: (r) => fmtDateTime(r.createdAt), hideBelow: 'md' },
            { key: 'go', header: <span className="sr-only">Open</span>, render: (r) => <Link className="text-sm font-semibold text-brand-700 hover:underline" to={`/admissions/${r.admissionId}/records`}>Open</Link> },
          ]}
        />
      </Card>
    </>
  );
}

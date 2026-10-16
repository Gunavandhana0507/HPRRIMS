import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useApi } from '../lib/useApi';
import { useAuth } from '../auth/AuthContext';
import { Alert, Card, EmptyState, Select } from '../components/ui';
import { DataTable, Pagination } from '../components/DataTable';
import { PageHeader, PatientLink, RiskIndicator } from '../components/domain';
import { fmtDateTime } from '../lib/format';

export default function PredictionsPage() {
  const { hasRole } = useAuth();
  const [riskLevel, setRiskLevel] = useState('');
  const [mine, setMine] = useState(hasRole('DOCTOR'));
  const [page, setPage] = useState(0);
  const { data, loading, error, reload } = useApi('/predictions', { riskLevel: riskLevel || undefined, mine: mine || undefined, page, size: 20 });

  return (
    <>
      <PageHeader title="Readmission risk" description="Latest saved prediction for each discharged admission, highest risk first." />
      <div className="mb-4"><Alert tone="info">Probabilities come from a logistic regression model trained on synthetic data. They are advisory and do not replace clinical judgement.</Alert></div>
      <Card bodyClassName="p-0">
        <div className="flex flex-wrap items-center gap-4 border-b border-line p-4">
          <Select aria-label="Risk level" value={riskLevel} onChange={(e) => { setRiskLevel(e.target.value); setPage(0); }} className="w-44">
            <option value="">All risk levels</option><option value="HIGH">High</option><option value="MEDIUM">Medium</option><option value="LOW">Low</option>
          </Select>
          {hasRole('DOCTOR') && (
            <label className="flex items-center gap-2 text-sm font-semibold text-ink-soft">
              <input type="checkbox" checked={mine} onChange={(e) => { setMine(e.target.checked); setPage(0); }} className="h-4 w-4 accent-brand-600" />
              Only my patients
            </label>
          )}
        </div>
        <DataTable caption="Predictions" loading={loading} error={error} onRetry={reload} rows={data?.content}
          empty={<EmptyState title="No predictions match">Predictions are saved automatically when a patient is discharged.</EmptyState>}
          columns={[
            { key: 'patient', header: 'Patient', render: (p) => <PatientLink id={p.patientId} code={p.patientCode} name={p.patientName} /> },
            { key: 'risk', header: 'Risk', render: (p) => <RiskIndicator probability={p.probability} level={p.riskLevel} /> },
            { key: 'createdAt', header: 'Saved', render: (p) => fmtDateTime(p.createdAt), hideBelow: 'md' },
            { key: 'modelVersion', header: 'Model', hideBelow: 'lg', render: (p) => <span className="font-mono text-xs">{p.modelVersion}</span> },
            { key: 'go', header: <span className="sr-only">Open</span>, render: (p) => <Link to={`/admissions/${p.admissionId}`} className="text-sm font-semibold text-brand-700 hover:underline">Admission</Link> },
          ]} />
        {data && <Pagination page={data.page} totalPages={data.totalPages} totalElements={data.totalElements} size={data.size} onPage={setPage} />}
      </Card>
    </>
  );
}

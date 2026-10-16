import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ClipboardPlus } from 'lucide-react';
import { useApi, useDebounced } from '../lib/useApi';
import { useAuth } from '../auth/AuthContext';
import { Button, Card, DateInput, EmptyState, SearchBar, Select } from '../components/ui';
import { DataTable, Pagination } from '../components/DataTable';
import { AdmissionStatusBadge, PageHeader, PatientLink, ReadmissionFlag } from '../components/domain';
import { fmtDateTime } from '../lib/format';

export default function AdmissionList() {
  const { hasRole } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [status, setStatus] = useState(params.get('status') || '');
  const [readmission, setReadmission] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [q, setQ] = useState('');
  const [mine, setMine] = useState(hasRole('DOCTOR'));
  const [page, setPage] = useState(0);
  const dq = useDebounced(q.trim());
  const rangeError = from && to && from > to ? 'Start date must be before end date' : null;

  const { data, loading, error, reload } = useApi(rangeError ? null : '/admissions', {
    status: status || undefined, readmission: readmission || undefined, from: from || undefined, to: to || undefined,
    q: dq || undefined, mine: mine || undefined, page, size: 15,
  });
  const reset = (setter) => (e) => { setter(e.target.value); setPage(0); };

  return (
    <>
      <PageHeader title="Admissions" description="Filter by status, admission date range or Patient ID."
        actions={hasRole('STAFF') && <Button icon={ClipboardPlus} onClick={() => navigate('/admissions/new')}>Create admission</Button>} />
      <Card bodyClassName="p-0">
        <div className="grid gap-3 border-b border-line p-4 md:grid-cols-2 xl:grid-cols-[1fr_9rem_10rem_10rem_10rem]">
          <SearchBar label="Search by Patient ID or name" value={q} onChange={(v) => { setQ(v); setPage(0); }} placeholder="Patient ID or name" />
          <Select aria-label="Status" value={status} onChange={reset(setStatus)}>
            <option value="">All statuses</option><option value="ADMITTED">Admitted</option><option value="DISCHARGED">Discharged</option>
          </Select>
          <Select aria-label="Readmission flag" value={readmission} onChange={reset(setReadmission)}>
            <option value="">All admissions</option><option value="true">Readmissions only</option><option value="false">Not readmissions</option>
          </Select>
          <DateInput aria-label="Admitted from" value={from} onChange={reset(setFrom)} error={rangeError} />
          <DateInput aria-label="Admitted to" value={to} onChange={reset(setTo)} />
          {hasRole('DOCTOR') && (
            <label className="flex items-center gap-2 text-sm font-semibold text-ink-soft md:col-span-2 xl:col-span-5">
              <input type="checkbox" checked={mine} onChange={(e) => { setMine(e.target.checked); setPage(0); }} className="h-4 w-4 accent-brand-600" />
              Only admissions assigned to me
            </label>
          )}
        </div>
        <DataTable
          caption="Admissions" loading={loading} error={error} onRetry={reload} rows={data?.content}
          onRowClick={(a) => navigate(`/admissions/${a.id}`)}
          empty={<EmptyState title="No admissions match these filters">Try a wider date range or clear the filters.</EmptyState>}
          columns={[
            { key: 'patient', header: 'Patient', render: (a) => <PatientLink id={a.patientId} code={a.patientCode} name={a.patientName} /> },
            { key: 'admittedAt', header: 'Admitted', render: (a) => fmtDateTime(a.admittedAt), hideBelow: 'sm' },
            { key: 'reason', header: 'Reason', hideBelow: 'lg', render: (a) => <span className="line-clamp-2">{a.reason}</span> },
            { key: 'doctorName', header: 'Doctor', hideBelow: 'md' },
            { key: 'dischargedAt', header: 'Discharged', render: (a) => fmtDateTime(a.dischargedAt), hideBelow: 'lg' },
            { key: 'status', header: 'Status', render: (a) => <div className="flex flex-wrap gap-1"><AdmissionStatusBadge status={a.status} /><ReadmissionFlag admission={a} compact /></div> },
          ]}
        />
        {data && <Pagination page={data.page} totalPages={data.totalPages} totalElements={data.totalElements} size={data.size} onPage={setPage} />}
      </Card>
    </>
  );
}

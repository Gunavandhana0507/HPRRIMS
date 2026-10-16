import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { UserPlus } from 'lucide-react';
import { useApi, useDebounced } from '../lib/useApi';
import { useAuth } from '../auth/AuthContext';
import { Button, Card, EmptyState, Input, SearchBar, Select } from '../components/ui';
import { DataTable, Pagination } from '../components/DataTable';
import { AdmissionStatusBadge, PageHeader } from '../components/domain';
import { fmtDate, titleCase } from '../lib/format';

export default function PatientList() {
  const { hasRole } = useAuth();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [q, setQ] = useState(params.get('q') || '');
  const [gender, setGender] = useState('');
  const [minAge, setMinAge] = useState('');
  const [maxAge, setMaxAge] = useState('');
  const [page, setPage] = useState(0);
  const dq = useDebounced(q.trim());
  const dMin = useDebounced(minAge);
  const dMax = useDebounced(maxAge);

  const query = { q: dq || undefined, gender: gender || undefined, minAge: dMin || undefined, maxAge: dMax || undefined, page, size: 15 };
  const { data, loading, error, reload } = useApi('/patients', query);
  const filtered = dq || gender || dMin || dMax;

  const update = (setter) => (v) => { setter(v); setPage(0); };

  return (
    <>
      <PageHeader
        title="Patients"
        description="Search by Patient ID (for example PAT-000012) or by name."
        actions={hasRole('STAFF') && <Button icon={UserPlus} onClick={() => navigate('/patients/new')}>Register patient</Button>}
      />
      <Card bodyClassName="p-0">
        <div className="grid gap-3 border-b border-line p-4 md:grid-cols-[1fr_10rem_7rem_7rem]">
          <SearchBar label="Search patients" value={q} placeholder="Patient ID or name"
            onChange={(v) => { update(setQ)(v); setParams(v ? { q: v } : {}, { replace: true }); }} />
          <Select label={<span className="sr-only">Gender</span>} value={gender} onChange={(e) => update(setGender)(e.target.value)} aria-label="Filter by gender">
            <option value="">All genders</option>
            <option value="FEMALE">Female</option>
            <option value="MALE">Male</option>
            <option value="OTHER">Other</option>
          </Select>
          <Input aria-label="Minimum age" type="number" min="0" max="130" placeholder="Min age" value={minAge} onChange={(e) => update(setMinAge)(e.target.value)} />
          <Input aria-label="Maximum age" type="number" min="0" max="130" placeholder="Max age" value={maxAge} onChange={(e) => update(setMaxAge)(e.target.value)} />
        </div>
        <DataTable
          caption="Patients"
          loading={loading} error={error} onRetry={reload}
          rows={data?.content}
          onRowClick={(p) => navigate(`/patients/${p.id}`)}
          empty={filtered
            ? <EmptyState title="No patients match your search">Check the Patient ID or spelling, or clear the filters.</EmptyState>
            : <EmptyState title="No patients registered yet" action={hasRole('STAFF') && <Link className="text-sm font-semibold text-brand-700 hover:underline" to="/patients/new">Register the first patient</Link>} />}
          columns={[
            { key: 'patientCode', header: 'Patient ID', render: (p) => <span className="font-mono text-sm text-brand-700">{p.patientCode}</span> },
            { key: 'fullName', header: 'Name', render: (p) => (
              <Link to={`/patients/${p.id}`} onClick={(e) => e.stopPropagation()} className="font-semibold text-ink hover:text-brand-700 hover:underline">{p.fullName}</Link>
            ) },
            { key: 'age', header: 'Age', className: 'tabular' },
            { key: 'gender', header: 'Gender', render: (p) => titleCase(p.gender), hideBelow: 'sm' },
            { key: 'contactNumber', header: 'Contact', hideBelow: 'lg', render: (p) => p.contactNumber || '—' },
            { key: 'registeredAt', header: 'Registered', render: (p) => fmtDate(p.registeredAt), hideBelow: 'md' },
            { key: 'status', header: 'Admission', render: (p) => <AdmissionStatusBadge status={p.currentAdmissionStatus === 'ADMITTED' ? 'ADMITTED' : null} /> },
          ]}
        />
        {data && <Pagination page={data.page} totalPages={data.totalPages} totalElements={data.totalElements} size={data.size} onPage={setPage} />}
      </Card>
    </>
  );
}

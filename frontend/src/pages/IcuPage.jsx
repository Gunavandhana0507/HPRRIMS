import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BedDouble } from 'lucide-react';
import { api, errorMessage } from '../lib/api';
import { useApi, useDebounced } from '../lib/useApi';
import { useAuth } from '../auth/AuthContext';
import { useToast } from '../components/Toast';
import { Button, Card, EmptyState, Modal, SearchBar, Select, Textarea } from '../components/ui';
import { DataTable, Pagination } from '../components/DataTable';
import { IcuStatusBadge, PageHeader, PatientLink, PriorityBadge } from '../components/domain';
import { fmtDateTime, fmtProb } from '../lib/format';
import IcuBedsPanel from './IcuBedsPanel';

const ACTION_TEXT = {
  allocate: ['Allocate ICU bed', 'Allocate'], reject: ['Reject ICU request', 'Reject'],
  cancel: ['Cancel ICU request', 'Cancel request'], release: ['Release ICU bed', 'Release bed'],
};

function Vitals({ r }) {
  return (
    <span className="tabular text-xs text-ink-soft">
      HR {r.heartRate} · BP {r.systolicBp} · RR {r.respiratoryRate} · SpO2 {r.spo2}% · T {r.temperature}° · GCS {r.gcs}
      {r.requiresVentilation && ' · ventilation'} · {r.comorbidityCount} comorb.
    </span>
  );
}

export default function IcuPage() {
  const { hasRole } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const isAdmin = hasRole('ADMIN');
  const canManage = hasRole('STAFF', 'ADMIN');
  const [status, setStatus] = useState('PENDING');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(0);
  const dq = useDebounced(q.trim());
  const beds = useApi('/icu/beds');
  const reqs = useApi('/icu/requests', { status: status || undefined, q: dq || undefined, page, size: 15 });
  const [action, setAction] = useState(null);
  const [busy, setBusy] = useState(false);
  const [rescoring, setRescoring] = useState(null);

  const refresh = () => { reqs.reload(); beds.reload(); };
  const available = (beds.data || []).filter((b) => b.status === 'AVAILABLE');

  const submitAction = async () => {
    const { type, request, bedId, notes } = action;
    if (type === 'allocate' && !bedId) { setAction({ ...action, error: 'Select a bed' }); return; }
    setBusy(true);
    try {
      const body = type === 'allocate' ? { bedId: Number(bedId), notes: notes || null } : { notes: notes || null };
      await api.post(`/icu/requests/${request.id}/${type}`, body);
      toast.success(`${ACTION_TEXT[type][1]} completed for ${request.patientName}.`);
      setAction(null);
      refresh();
    } catch (err) {
      setAction({ ...action, error: errorMessage(err) });
      if (err.response?.status === 409) beds.reload();
    } finally {
      setBusy(false);
    }
  };

  const rescore = async (r) => {
    setRescoring(r.id);
    try {
      const res = await api.post(`/icu/requests/${r.id}/rescore`);
      if (res.data.scoringStatus === 'UNAVAILABLE') toast.error('The scoring service is still unavailable.');
      else toast.success('Advisory priority updated.');
      reqs.reload();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setRescoring(null);
    }
  };

  return (
    <>
      <PageHeader title="ICU beds and requests"
        description="Priority is an advisory score from a classifier trained on synthetic data. Allocation decisions are made by an administrator."
        actions={hasRole('STAFF') && <Button icon={BedDouble} onClick={() => navigate('/icu/requests/new')}>Request ICU bed</Button>} />
      <IcuBedsPanel beds={beds} onChanged={refresh} />
      <Card title="Requests" className="mt-6" bodyClassName="p-0">
        <div className="grid gap-3 border-b border-line p-4 md:grid-cols-[1fr_12rem]">
          <SearchBar label="Search requests by patient" value={q} onChange={(v) => { setQ(v); setPage(0); }} placeholder="Patient ID or name" />
          <Select aria-label="Request status" value={status} onChange={(e) => { setStatus(e.target.value); setPage(0); }}>
            <option value="">All statuses</option>
            {['PENDING', 'ALLOCATED', 'RELEASED', 'REJECTED', 'CANCELLED'].map((s) => <option key={s} value={s}>{s.charAt(0) + s.slice(1).toLowerCase()}</option>)}
          </Select>
        </div>
        <DataTable caption="ICU requests" loading={reqs.loading} error={reqs.error} onRetry={reqs.reload} rows={reqs.data?.content}
          empty={<EmptyState title={status === 'PENDING' ? 'No pending ICU requests' : 'No requests match these filters'} />}
          columns={[
            { key: 'patient', header: 'Patient', render: (r) => (
              <div className="flex flex-col gap-0.5"><PatientLink id={r.patientId} code={r.patientCode} name={r.patientName} /><span className="hidden lg:block"><Vitals r={r} /></span></div>
            ) },
            { key: 'priority', header: 'Advisory priority', render: (r) => (
              <span className="flex flex-col items-start gap-1"><PriorityBadge level={r.priorityLevel} status={r.scoringStatus} />
                {r.priorityScore != null && <span className="tabular text-xs text-ink-muted">{fmtProb(r.priorityScore)}</span>}</span>
            ) },
            { key: 'createdAt', header: 'Requested', hideBelow: 'md', render: (r) => <span>{fmtDateTime(r.createdAt)}<span className="block text-xs text-ink-muted">{r.requestedByName}</span></span> },
            { key: 'status', header: 'Status', render: (r) => <span className="flex flex-wrap items-center gap-1"><IcuStatusBadge status={r.status} />{r.bedNumber && <span className="font-mono text-xs">{r.bedNumber}</span>}</span> },
            { key: 'act', header: <span className="sr-only">Actions</span>, render: (r) => (
              <div className="flex flex-wrap justify-end gap-1">
                {canManage && r.scoringStatus === 'UNAVAILABLE' && r.status === 'PENDING' && <Button size="sm" variant="ghost" loading={rescoring === r.id} onClick={() => rescore(r)}>Rescore</Button>}
                {isAdmin && r.status === 'PENDING' && <Button size="sm" onClick={() => setAction({ type: 'allocate', request: r, bedId: available[0]?.id ? String(available[0].id) : '' })}>Allocate</Button>}
                {isAdmin && r.status === 'PENDING' && <Button size="sm" variant="ghost" onClick={() => setAction({ type: 'reject', request: r })}>Reject</Button>}
                {canManage && r.status === 'PENDING' && <Button size="sm" variant="ghost" onClick={() => setAction({ type: 'cancel', request: r })}>Cancel</Button>}
                {canManage && r.status === 'ALLOCATED' && <Button size="sm" variant="secondary" onClick={() => setAction({ type: 'release', request: r })}>Release</Button>}
              </div>
            ) },
          ]} />
        {reqs.data && <Pagination page={reqs.data.page} totalPages={reqs.data.totalPages} totalElements={reqs.data.totalElements} size={reqs.data.size} onPage={setPage} />}
      </Card>
      <Modal open={!!action} onClose={() => setAction(null)} title={action ? ACTION_TEXT[action.type][0] : ''}
        footer={<><Button variant="secondary" onClick={() => setAction(null)}>Close</Button>
          <Button variant={action?.type === 'reject' ? 'danger' : 'primary'} loading={busy} onClick={submitAction}
            disabled={action?.type === 'allocate' && !available.length}>{action ? ACTION_TEXT[action.type][1] : ''}</Button></>}>
        {action && (
          <div className="flex flex-col gap-4">
            <p className="text-sm">{action.request.patientName} ({action.request.patientCode}) · advisory priority <PriorityBadge level={action.request.priorityLevel} status={action.request.scoringStatus} /></p>
            <Vitals r={action.request} />
            {action.type === 'allocate' && (available.length ? (
              <Select label="Available bed" required value={action.bedId} onChange={(e) => setAction({ ...action, bedId: e.target.value, error: null })}>
                {available.map((b) => <option key={b.id} value={b.id}>{b.bedNumber} · {b.ward}</option>)}
              </Select>
            ) : <p className="text-sm font-semibold text-bad-700">No ICU beds are available. Release or add a bed first.</p>)}
            <Textarea label="Notes" rows={2} value={action.notes || ''} onChange={(e) => setAction({ ...action, notes: e.target.value })} />
            {action.error && <p role="alert" className="text-sm font-semibold text-bad-600">{action.error}</p>}
          </div>
        )}
      </Modal>
    </>
  );
}

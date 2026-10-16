import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { History, PenLine, Save } from 'lucide-react';
import { api, errorMessage, fieldErrors } from '../lib/api';
import { useApi } from '../lib/useApi';
import { useAuth } from '../auth/AuthContext';
import { useToast } from '../components/Toast';
import { Alert, Badge, Button, Card, EmptyState, ErrorState, Modal, Spinner, Textarea } from '../components/ui';
import { AdmissionStatusBadge, PageHeader } from '../components/domain';
import { fmtDateTime } from '../lib/format';

const BLANK = { diagnosis: '', prescription: '', treatmentNotes: '' };

function RecordFields({ form, setForm, errors }) {
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  return (
    <div className="flex flex-col gap-4">
      <Textarea label="Diagnosis" rows={2} value={form.diagnosis} onChange={set('diagnosis')} error={errors.diagnosis} />
      <Textarea label="Prescription" rows={3} value={form.prescription} onChange={set('prescription')} error={errors.prescription}
        hint="Stored as clinical text. Include drug, dose, route and frequency." />
      <Textarea label="Treatment notes" rows={4} value={form.treatmentNotes} onChange={set('treatmentNotes')} error={errors.treatmentNotes} />
    </div>
  );
}

export default function MedicalRecords() {
  const { id } = useParams();
  const { user, hasRole } = useAuth();
  const toast = useToast();
  const adm = useApi(`/admissions/${id}`);
  const recs = useApi(`/admissions/${id}/records`);
  const [form, setForm] = useState(BLANK);
  const [errors, setErrors] = useState({});
  const [failure, setFailure] = useState(null);
  const [saving, setSaving] = useState(false);
  const [correcting, setCorrecting] = useState(null);
  const [revisions, setRevisions] = useState(null);

  if (adm.loading && !adm.data) return <Spinner label="Loading admission" />;
  if (adm.error) return <ErrorState message={adm.error} onRetry={adm.reload} />;
  const a = adm.data;
  const canAdd = hasRole('DOCTOR') && a.status === 'ADMITTED' && a.doctorId === user.id;
  const empty = (f) => !f.diagnosis.trim() && !f.prescription.trim() && !f.treatmentNotes.trim();

  const add = async (e) => {
    e.preventDefault();
    setFailure(null);
    if (empty(form)) { setErrors({ diagnosis: 'Enter a diagnosis, prescription or treatment note' }); return; }
    setErrors({});
    setSaving(true);
    try {
      await api.post(`/admissions/${id}/records`, form);
      toast.success('Medical record saved.');
      setForm(BLANK);
      recs.reload();
    } catch (err) {
      setErrors(fieldErrors(err));
      setFailure(errorMessage(err, 'The record could not be saved.'));
    } finally {
      setSaving(false);
    }
  };

  const saveCorrection = async () => {
    const c = correcting;
    if (!c.reason.trim()) { setCorrecting({ ...c, errors: { reason: 'A correction reason is required' } }); return; }
    setCorrecting({ ...c, saving: true, errors: {} });
    try {
      await api.put(`/records/${c.id}`, { diagnosis: c.diagnosis, prescription: c.prescription, treatmentNotes: c.treatmentNotes, reason: c.reason });
      toast.success('Correction saved. The previous version is kept in the revision history.');
      setCorrecting(null);
      recs.reload();
    } catch (err) {
      setCorrecting({ ...c, saving: false, errors: fieldErrors(err), failure: errorMessage(err) });
    }
  };

  const openRevisions = async (r) => {
    setRevisions({ record: r, loading: true });
    try {
      const res = await api.get(`/records/${r.id}/revisions`);
      setRevisions({ record: r, items: res.data });
    } catch (err) {
      setRevisions({ record: r, error: errorMessage(err) });
    }
  };

  return (
    <>
      <PageHeader
        title={`Medical records · ${a.patientName}`}
        description={`${a.patientCode} · admitted ${fmtDateTime(a.admittedAt)} for ${a.reason} · ${a.doctorName}`}
        breadcrumbs={[{ label: 'Admissions', to: '/admissions' }, { label: `#${id}`, to: `/admissions/${id}` }, { label: 'Records' }]}
        actions={<AdmissionStatusBadge status={a.status} />}
      />
      <div className="grid gap-6 xl:grid-cols-[1fr_26rem]">
        <Card title="Entries (oldest first)">
          {recs.loading && !recs.data ? <Spinner /> : recs.error ? <ErrorState message={recs.error} onRetry={recs.reload} /> : !recs.data.length ? (
            <EmptyState title="No medical records yet">{canAdd ? 'Add the first entry using the form.' : 'Entries are added by the assigned doctor.'}</EmptyState>
          ) : (
            <ol className="flex flex-col gap-4">
              {recs.data.map((r) => (
                <li key={r.id} className="rounded border border-line p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm text-ink-muted"><time dateTime={r.createdAt}>{fmtDateTime(r.createdAt)}</time> · {r.doctorName}</p>
                    <div className="flex items-center gap-1">
                      {r.corrected && <Badge tone="warn">Corrected {fmtDateTime(r.updatedAt)}</Badge>}
                      {r.corrected && <Button size="sm" variant="ghost" icon={History} onClick={() => openRevisions(r)}>History</Button>}
                      {((hasRole('DOCTOR') && r.doctorId === user.id) || hasRole('ADMIN')) && (
                        <Button size="sm" variant="ghost" icon={PenLine} onClick={() => setCorrecting({ ...r, diagnosis: r.diagnosis || '', prescription: r.prescription || '', treatmentNotes: r.treatmentNotes || '', reason: '', errors: {} })}>Correct</Button>
                      )}
                    </div>
                  </div>
                  {r.diagnosis && <p className="mt-2"><span className="font-semibold">Diagnosis:</span> {r.diagnosis}</p>}
                  {r.prescription && <p className="mt-1 whitespace-pre-wrap"><span className="font-semibold">Prescription:</span> {r.prescription}</p>}
                  {r.treatmentNotes && <p className="mt-1 whitespace-pre-wrap text-ink-soft">{r.treatmentNotes}</p>}
                </li>
              ))}
            </ol>
          )}
        </Card>
        <Card title="Add entry">
          {canAdd ? (
            <form onSubmit={add} noValidate>
              {failure && <div className="mb-4"><Alert tone="bad">{failure}</Alert></div>}
              <RecordFields form={form} setForm={setForm} errors={errors} />
              <p className="mt-3 text-xs text-ink-muted">Time and author are recorded by the server. Entries cannot be deleted.</p>
              <Button type="submit" loading={saving} icon={Save} className="mt-4 w-full">Save entry</Button>
            </form>
          ) : (
            <p className="text-sm text-ink-muted">
              {a.status !== 'ADMITTED' ? 'This admission is discharged. New entries can only be added to active admissions.'
                : hasRole('DOCTOR') ? `Only the assigned doctor (${a.doctorName}) can add entries.` : 'Only the assigned doctor can add entries.'}
              {' '}<Link to={`/admissions/${id}`} className="font-semibold text-brand-700 hover:underline">Back to admission</Link>
            </p>
          )}
        </Card>
      </div>
      <Modal open={!!correcting} onClose={() => setCorrecting(null)} title="Correct medical record" size="lg"
        footer={<><Button variant="secondary" onClick={() => setCorrecting(null)}>Cancel</Button><Button loading={correcting?.saving} onClick={saveCorrection}>Save correction</Button></>}>
        {correcting && (
          <div className="flex flex-col gap-4">
            {correcting.failure && <Alert tone="bad">{correcting.failure}</Alert>}
            <RecordFields form={correcting} setForm={(fn) => setCorrecting((c) => fn(c))} errors={correcting.errors} />
            <Textarea label="Reason for correction" required rows={2} value={correcting.reason} error={correcting.errors.reason}
              onChange={(e) => setCorrecting((c) => ({ ...c, reason: e.target.value }))} />
          </div>
        )}
      </Modal>
      <Modal open={!!revisions} onClose={() => setRevisions(null)} title="Revision history" size="lg">
        {revisions?.loading && <Spinner />}
        {revisions?.error && <Alert tone="bad">{revisions.error}</Alert>}
        {revisions?.items && (
          <ol className="flex flex-col gap-3 text-sm">
            {revisions.items.map((v) => (
              <li key={v.id} className="rounded border border-line p-3">
                <p className="text-xs text-ink-muted">Replaced {fmtDateTime(v.revisedAt)} by {v.revisedByName} · reason: {v.reason}</p>
                {v.diagnosis && <p className="mt-1"><span className="font-semibold">Diagnosis:</span> {v.diagnosis}</p>}
                {v.prescription && <p className="mt-1"><span className="font-semibold">Prescription:</span> {v.prescription}</p>}
                {v.treatmentNotes && <p className="mt-1 text-ink-soft">{v.treatmentNotes}</p>}
              </li>
            ))}
          </ol>
        )}
      </Modal>
    </>
  );
}

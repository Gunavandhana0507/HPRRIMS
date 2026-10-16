import { useState } from 'react';
import { Plus } from 'lucide-react';
import { api, errorMessage, fieldErrors } from '../lib/api';
import { useAuth } from '../auth/AuthContext';
import { useToast } from '../components/Toast';
import { Alert, Button, Card, EmptyState, ErrorState, Input, Modal, Spinner } from '../components/ui';
import { BedStatusBadge } from '../components/domain';

export default function IcuBedsPanel({ beds, onChanged }) {
  const { hasRole } = useAuth();
  const toast = useToast();
  const isAdmin = hasRole('ADMIN');
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ bedNumber: '', ward: 'ICU' });
  const [errors, setErrors] = useState({});
  const [failure, setFailure] = useState(null);
  const [saving, setSaving] = useState(false);
  const [busyBed, setBusyBed] = useState(null);

  const addBed = async () => {
    const v = {};
    if (!/^[A-Za-z0-9-]{2,20}$/.test(form.bedNumber.trim())) v.bedNumber = 'Use 2-20 letters, numbers or hyphens';
    if (!form.ward.trim()) v.ward = 'Ward is required';
    setErrors(v);
    if (Object.keys(v).length) return;
    setSaving(true);
    setFailure(null);
    try {
      await api.post('/icu/beds', { bedNumber: form.bedNumber.trim(), ward: form.ward.trim() });
      toast.success(`Bed ${form.bedNumber.trim()} added.`);
      setAdding(false);
      setForm({ bedNumber: '', ward: 'ICU' });
      onChanged();
    } catch (err) {
      setErrors(fieldErrors(err));
      setFailure(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const setStatus = async (bed, status) => {
    setBusyBed(bed.id);
    try {
      await api.patch(`/icu/beds/${bed.id}/status`, { status });
      toast.success(`Bed ${bed.bedNumber} marked ${status === 'MAINTENANCE' ? 'in maintenance' : 'available'}.`);
      onChanged();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusyBed(null);
    }
  };

  const list = beds.data || [];
  const count = (s) => list.filter((b) => b.status === s).length;
  return (
    <Card
      title={beds.data ? `ICU beds · ${count('AVAILABLE')} available, ${count('OCCUPIED')} occupied${count('MAINTENANCE') ? `, ${count('MAINTENANCE')} maintenance` : ''}` : 'ICU beds'}
      actions={isAdmin && <Button size="sm" variant="secondary" icon={Plus} onClick={() => setAdding(true)}>Add bed</Button>}
    >
      {beds.loading && !beds.data ? <Spinner label="Loading beds" /> : beds.error ? <ErrorState message={beds.error} onRetry={beds.reload} /> : !list.length ? (
        <EmptyState title="No ICU beds configured">{isAdmin ? 'Add the first bed to start allocating.' : 'An administrator needs to add ICU beds.'}</EmptyState>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4" aria-label="ICU beds">
          {list.map((b) => (
            <li key={b.id} className="flex flex-col gap-2 rounded border border-line p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-sm font-semibold">{b.bedNumber}</span>
                <BedStatusBadge status={b.status} />
              </div>
              <p className="text-xs text-ink-muted">{b.ward}</p>
              {b.status === 'OCCUPIED' && b.patientName && <p className="text-sm"><span className="font-semibold">{b.patientName}</span> <span className="font-mono text-xs text-ink-muted">{b.patientCode}</span></p>}
              {isAdmin && b.status === 'AVAILABLE' && (
                <Button size="sm" variant="ghost" loading={busyBed === b.id} onClick={() => setStatus(b, 'MAINTENANCE')}>Mark maintenance</Button>
              )}
              {isAdmin && b.status === 'MAINTENANCE' && (
                <Button size="sm" variant="ghost" loading={busyBed === b.id} onClick={() => setStatus(b, 'AVAILABLE')}>Mark available</Button>
              )}
            </li>
          ))}
        </ul>
      )}
      <Modal open={adding} onClose={() => setAdding(false)} title="Add ICU bed"
        footer={<><Button variant="secondary" onClick={() => setAdding(false)}>Cancel</Button><Button loading={saving} onClick={addBed}>Add bed</Button></>}>
        <div className="flex flex-col gap-4">
          {failure && <Alert tone="bad">{failure}</Alert>}
          <Input label="Bed number" required value={form.bedNumber} onChange={(e) => setForm((f) => ({ ...f, bedNumber: e.target.value }))} error={errors.bedNumber} placeholder="ICU-09" />
          <Input label="Ward" required value={form.ward} onChange={(e) => setForm((f) => ({ ...f, ward: e.target.value }))} error={errors.ward} />
        </div>
      </Modal>
    </Card>
  );
}

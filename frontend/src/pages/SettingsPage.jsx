import { useEffect, useState } from 'react';
import { Save } from 'lucide-react';
import { api, errorMessage, fieldErrors } from '../lib/api';
import { useApi } from '../lib/useApi';
import { useToast } from '../components/Toast';
import { Alert, Badge, Button, Card, ErrorState, Input, Spinner } from '../components/ui';
import { PageHeader } from '../components/domain';

export default function SettingsPage() {
  const toast = useToast();
  const settings = useApi('/settings');
  const ml = useApi('/admin/ml-status');
  const [days, setDays] = useState('');
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (settings.data) setDays(String(settings.data.readmissionWindowDays)); }, [settings.data]);

  const save = async (e) => {
    e.preventDefault();
    const n = Number(days);
    if (!Number.isInteger(n) || n < 1 || n > 365) { setError('Window must be a whole number between 1 and 365 days'); return; }
    setError(null);
    setSaving(true);
    try {
      const res = await api.put('/admin/settings/readmission-window', { days: n });
      settings.setData(res.data);
      toast.success(`Readmission window set to ${res.data.readmissionWindowDays} days. Applies to new admissions.`);
    } catch (err) {
      setError(fieldErrors(err).days || errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <PageHeader title="Settings" description="Rules used by the backend. Changes are written to the audit log." />
      <div className="grid gap-6 xl:grid-cols-2">
        <Card title="Readmission detection window">
          {settings.loading && !settings.data ? <Spinner /> : settings.error ? <ErrorState message={settings.error} onRetry={settings.reload} /> : (
            <form onSubmit={save} noValidate className="flex flex-col gap-4">
              <p className="text-sm text-ink-soft">A new admission is flagged as a readmission when it starts within this many days of the patient's most recent discharge. Existing flags are not recalculated.</p>
              <Input label="Window (days)" type="number" min="1" max="365" value={days} onChange={(e) => setDays(e.target.value)} error={error} className="sm:max-w-[12rem]" />
              <p className="text-xs text-ink-muted">Staff can edit discharge details for {settings.data.staffDischargeEditHours} hours after discharge (server configuration).</p>
              <div><Button type="submit" loading={saving} icon={Save}>Save window</Button></div>
            </form>
          )}
        </Card>
        <Card title="Prediction service" actions={<Button size="sm" variant="secondary" onClick={ml.reload} loading={ml.loading}>Check again</Button>}>
          {ml.loading && !ml.data ? <Spinner /> : ml.error ? <ErrorState message={ml.error} onRetry={ml.reload} /> : (
            <div className="flex flex-col gap-3 text-sm">
              <p>{ml.data.available ? <Badge tone="ok">Reachable</Badge> : <Badge tone="bad">Unavailable</Badge>}</p>
              {!ml.data.available && <Alert tone="warn">{ml.data.message || 'The ML service is not responding. Discharges and ICU requests still work; scores are marked unavailable.'}</Alert>}
              {ml.data.readmissionModel && <p><span className="font-semibold">Readmission model:</span> {ml.data.readmissionModel}</p>}
              {ml.data.icuModel && <p><span className="font-semibold">ICU priority model:</span> {ml.data.icuModel}</p>}
              <p className="text-xs text-ink-muted">Models are trained on synthetic data and give advisory output only.</p>
            </div>
          )}
        </Card>
      </div>
    </>
  );
}

import { useState } from 'react';
import { Download } from 'lucide-react';
import { downloadFile, errorMessage } from '../lib/api';
import { useToast } from '../components/Toast';
import { Alert, Button, Card, DateInput } from '../components/ui';
import { PageHeader } from '../components/domain';

const REPORTS = [
  { type: 'ADMISSIONS', title: 'Admissions', text: 'Every admission in the range with patient, doctor, dates, status and readmission flag.' },
  { type: 'READMISSIONS', title: 'Readmissions', text: 'Admissions flagged as readmissions, with the previous discharge and days between.' },
  { type: 'ICU', title: 'ICU requests', text: 'ICU requests with clinical indicators, advisory priority, decision and bed.' },
  { type: 'PREDICTIONS', title: 'Readmission predictions', text: 'Saved readmission risk predictions with probability, level and model version.' },
];

export default function ReportsPage() {
  const toast = useToast();
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [busy, setBusy] = useState(null);
  const rangeError = from && to && from > to ? 'Start date must be on or before end date' : null;

  const download = async (type) => {
    if (rangeError) return;
    setBusy(type);
    try {
      await downloadFile(`/reports/${type}`, { from: from || undefined, to: to || undefined });
      toast.success('Report downloaded.');
    } catch (e) {
      toast.error(errorMessage(e, 'The report could not be generated.'));
    } finally {
      setBusy(null);
    }
  };

  return (
    <>
      <PageHeader title="Reports" description="CSV files generated from the live database. Leave the dates empty to include all records." />
      <Card className="mb-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:max-w-xl">
          <DateInput label="From" value={from} onChange={(e) => setFrom(e.target.value)} error={rangeError} />
          <DateInput label="To" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
      </Card>
      {rangeError && <div className="mb-4"><Alert tone="bad">{rangeError}</Alert></div>}
      <ul className="divide-y divide-line rounded-md border border-line bg-surface">
        {REPORTS.map((r) => (
          <li key={r.type} className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-semibold">{r.title}</h2>
              <p className="mt-0.5 max-w-xl text-sm text-ink-soft">{r.text}</p>
            </div>
            <Button variant="secondary" icon={Download} loading={busy === r.type} disabled={!!rangeError || (busy && busy !== r.type)} onClick={() => download(r.type)}>
              Download CSV
            </Button>
          </li>
        ))}
      </ul>
    </>
  );
}

import { useState } from 'react';
import { useApi, useDebounced } from '../lib/useApi';
import { Card, DateInput, EmptyState, Input, SearchBar, Select } from '../components/ui';
import { DataTable, Pagination } from '../components/DataTable';
import { PageHeader } from '../components/domain';
import { fmtDateTime, titleCase } from '../lib/format';

const ENTITIES = ['USER', 'PATIENT', 'ADMISSION', 'MEDICAL_RECORD', 'PREDICTION', 'ICU_BED', 'ICU_REQUEST', 'SETTING', 'AUTH'];

export default function AuditPage() {
  const [actor, setActor] = useState('');
  const [action, setAction] = useState('');
  const [entityType, setEntityType] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [page, setPage] = useState(0);
  const dActor = useDebounced(actor.trim());
  const dAction = useDebounced(action.trim());
  const rangeError = from && to && from > to ? 'Start date must be before end date' : null;
  const { data, loading, error, reload } = useApi(rangeError ? null : '/admin/audit-logs', {
    actor: dActor || undefined, action: dAction || undefined, entityType: entityType || undefined,
    from: from || undefined, to: to || undefined, page, size: 25,
  });
  const reset = (setter) => (v) => { setter(typeof v === 'string' ? v : v.target.value); setPage(0); };

  return (
    <>
      <PageHeader title="Audit log" description="Sign-ins, record changes, corrections, discharges and ICU decisions, newest first." />
      <Card bodyClassName="p-0">
        <div className="grid gap-3 border-b border-line p-4 md:grid-cols-2 xl:grid-cols-5">
          <SearchBar label="Filter by user" value={actor} onChange={reset(setActor)} placeholder="Username" />
          <Input aria-label="Action" value={action} onChange={reset(setAction)} placeholder="Action, e.g. DISCHARGE" />
          <Select aria-label="Entity type" value={entityType} onChange={reset(setEntityType)}>
            <option value="">All entities</option>
            {ENTITIES.map((e) => <option key={e} value={e}>{titleCase(e)}</option>)}
          </Select>
          <DateInput aria-label="From date" value={from} onChange={reset(setFrom)} error={rangeError} />
          <DateInput aria-label="To date" value={to} onChange={reset(setTo)} />
        </div>
        <DataTable
          caption="Audit log entries" loading={loading} error={error} onRetry={reload} rows={data?.content}
          empty={<EmptyState title="No audit entries match these filters" />}
          columns={[
            { key: 'createdAt', header: 'Time', render: (l) => <span className="whitespace-nowrap">{fmtDateTime(l.createdAt)}</span> },
            { key: 'actorUsername', header: 'User', render: (l) => <span className="font-mono text-xs">{l.actorUsername || 'system'}</span> },
            { key: 'action', header: 'Action', render: (l) => <span className="font-mono text-xs">{l.action}</span> },
            { key: 'entity', header: 'Entity', hideBelow: 'md', render: (l) => `${titleCase(l.entityType)}${l.entityId ? ` #${l.entityId}` : ''}` },
            { key: 'details', header: 'Details', hideBelow: 'lg', render: (l) => (
              <span className="line-clamp-2 text-ink-soft">{l.details}{l.reason && <><br /><span className="font-semibold text-ink">Reason:</span> {l.reason}</>}</span>
            ) },
          ]}
        />
        {data && <Pagination page={data.page} totalPages={data.totalPages} totalElements={data.totalElements} size={data.size} onPage={setPage} />}
      </Card>
    </>
  );
}

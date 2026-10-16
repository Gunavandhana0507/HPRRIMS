import { useState } from 'react';
import { UserPlus } from 'lucide-react';
import { api, errorMessage, fieldErrors } from '../lib/api';
import { useApi, useDebounced } from '../lib/useApi';
import { useAuth } from '../auth/AuthContext';
import { useToast } from '../components/Toast';
import { Alert, Badge, Button, Card, ConfirmDialog, EmptyState, Input, Modal, SearchBar, Select } from '../components/ui';
import { DataTable, Pagination } from '../components/DataTable';
import { PageHeader } from '../components/domain';
import { fmtDateTime } from '../lib/format';

const ROLE_LABEL = { ADMIN: 'Admin', DOCTOR: 'Doctor', STAFF: 'Hospital Staff' };
const PW = /^(?=.*[A-Za-z])(?=.*[0-9]).{8,100}$/;
const BLANK = { username: '', password: '', fullName: '', email: '', role: 'STAFF', specialization: '', newPassword: '' };

function validate(f, creating) {
  const e = {};
  if (creating && !/^[a-zA-Z0-9._-]{3,50}$/.test(f.username)) e.username = 'Use 3-50 letters, numbers, dots, dashes or underscores';
  if (creating && !PW.test(f.password)) e.password = 'At least 8 characters with a letter and a number';
  if (!creating && f.newPassword && !PW.test(f.newPassword)) e.newPassword = 'At least 8 characters with a letter and a number';
  if (!f.fullName.trim()) e.fullName = 'Full name is required';
  if (f.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email)) e.email = 'Enter a valid email address';
  return e;
}

export default function UsersPage() {
  const { user: me } = useAuth();
  const toast = useToast();
  const [q, setQ] = useState('');
  const [role, setRole] = useState('');
  const [active, setActive] = useState('');
  const [page, setPage] = useState(0);
  const dq = useDebounced(q.trim());
  const list = useApi('/users', { q: dq || undefined, role: role || undefined, active: active || undefined, page, size: 20 });
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(BLANK);
  const [errors, setErrors] = useState({});
  const [failure, setFailure] = useState(null);
  const [saving, setSaving] = useState(false);
  const [toggle, setToggle] = useState(null);
  const [toggling, setToggling] = useState(false);

  const creating = editing === 'new';
  const open = (u) => {
    setEditing(u ? u.id : 'new');
    setForm(u ? { ...BLANK, fullName: u.fullName, email: u.email || '', role: u.role, specialization: u.specialization || '' } : BLANK);
    setErrors({});
    setFailure(null);
  };
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const save = async () => {
    const v = validate(form, creating);
    setErrors(v);
    if (Object.keys(v).length) return;
    setSaving(true);
    setFailure(null);
    const common = { fullName: form.fullName.trim(), email: form.email.trim() || null, role: form.role, specialization: form.role === 'DOCTOR' ? form.specialization.trim() || null : null };
    try {
      if (creating) await api.post('/users', { ...common, username: form.username.trim(), password: form.password });
      else await api.put(`/users/${editing}`, { ...common, newPassword: form.newPassword || null });
      toast.success(creating ? 'User account created.' : 'User updated.');
      setEditing(null);
      list.reload();
    } catch (err) {
      setErrors(fieldErrors(err));
      setFailure(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const doToggle = async () => {
    setToggling(true);
    try {
      await api.patch(`/users/${toggle.id}/status`, { active: !toggle.active });
      toast.success(toggle.active ? `${toggle.username} deactivated.` : `${toggle.username} reactivated.`);
      setToggle(null);
      list.reload();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setToggling(false);
    }
  };

  const reset = (setter) => (e) => { setter(e.target.value); setPage(0); };
  return (
    <>
      <PageHeader title="User accounts" description="Deactivated accounts cannot sign in. Accounts are never deleted, so audit history stays intact."
        actions={<Button icon={UserPlus} onClick={() => open(null)}>Create user</Button>} />
      <Card bodyClassName="p-0">
        <div className="grid gap-3 border-b border-line p-4 md:grid-cols-[1fr_11rem_10rem]">
          <SearchBar label="Search users" value={q} onChange={(v) => { setQ(v); setPage(0); }} placeholder="Username or name" />
          <Select aria-label="Role" value={role} onChange={reset(setRole)}>
            <option value="">All roles</option>{Object.entries(ROLE_LABEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
          </Select>
          <Select aria-label="Status" value={active} onChange={reset(setActive)}>
            <option value="">Any status</option><option value="true">Active</option><option value="false">Deactivated</option>
          </Select>
        </div>
        <DataTable caption="Users" loading={list.loading} error={list.error} onRetry={list.reload} rows={list.data?.content}
          empty={<EmptyState title="No users match these filters" />}
          columns={[
            { key: 'fullName', header: 'Name', render: (u) => <span><span className="font-semibold">{u.fullName}</span><br /><span className="font-mono text-xs text-ink-muted">{u.username}</span></span> },
            { key: 'role', header: 'Role', render: (u) => <span>{ROLE_LABEL[u.role]}{u.specialization && <span className="block text-xs text-ink-muted">{u.specialization}</span>}</span> },
            { key: 'email', header: 'Email', hideBelow: 'lg', render: (u) => u.email || '—' },
            { key: 'lastLoginAt', header: 'Last sign-in', hideBelow: 'md', render: (u) => fmtDateTime(u.lastLoginAt) },
            { key: 'active', header: 'Status', render: (u) => (u.active ? <Badge tone="ok">Active</Badge> : <Badge tone="bad">Deactivated</Badge>) },
            { key: 'act', header: <span className="sr-only">Actions</span>, render: (u) => (
              <div className="flex justify-end gap-1">
                <Button size="sm" variant="ghost" onClick={() => open(u)}>Edit</Button>
                {u.id !== me.id && <Button size="sm" variant="ghost" onClick={() => setToggle(u)}>{u.active ? 'Deactivate' : 'Reactivate'}</Button>}
              </div>
            ) },
          ]} />
        {list.data && <Pagination page={list.data.page} totalPages={list.data.totalPages} totalElements={list.data.totalElements} size={list.data.size} onPage={setPage} />}
      </Card>

      <Modal open={editing != null} onClose={() => setEditing(null)} title={creating ? 'Create user' : 'Edit user'}
        footer={<><Button variant="secondary" onClick={() => setEditing(null)}>Cancel</Button><Button loading={saving} onClick={save}>{creating ? 'Create user' : 'Save'}</Button></>}>
        <div className="flex flex-col gap-4">
          {failure && <Alert tone="bad">{failure}</Alert>}
          {creating && <Input label="Username" required value={form.username} onChange={set('username')} error={errors.username} autoComplete="off" />}
          {creating && <Input label="Initial password" required type="password" value={form.password} onChange={set('password')} error={errors.password} autoComplete="new-password" hint="At least 8 characters with a letter and a number." />}
          <Input label="Full name" required value={form.fullName} onChange={set('fullName')} error={errors.fullName} />
          <Input label="Email" type="email" value={form.email} onChange={set('email')} error={errors.email} />
          <Select label="Role" required value={form.role} onChange={set('role')} error={errors.role} disabled={!creating && editing === me.id}>
            {Object.entries(ROLE_LABEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
          </Select>
          {form.role === 'DOCTOR' && <Input label="Specialization" value={form.specialization} onChange={set('specialization')} error={errors.specialization} />}
          {!creating && <Input label="New password" type="password" value={form.newPassword} onChange={set('newPassword')} error={errors.newPassword} autoComplete="new-password" hint="Leave empty to keep the current password." />}
        </div>
      </Modal>
      <ConfirmDialog open={!!toggle} loading={toggling} onClose={() => setToggle(null)} onConfirm={doToggle}
        title={toggle?.active ? 'Deactivate account?' : 'Reactivate account?'} tone={toggle?.active ? 'danger' : 'primary'}
        confirmLabel={toggle?.active ? 'Deactivate' : 'Reactivate'}>
        {toggle?.active ? `${toggle?.fullName} will be signed out at their next request and will not be able to sign in.` : `${toggle?.fullName} will be able to sign in again.`}
      </ConfirmDialog>
    </>
  );
}

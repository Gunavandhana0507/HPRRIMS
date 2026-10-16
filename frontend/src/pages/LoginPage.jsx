import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, LogIn } from 'lucide-react';
import { HOME_BY_ROLE, useAuth } from '../auth/AuthContext';
import { errorMessage } from '../lib/api';
import { Alert, Button, Input } from '../components/ui';
import { Logo } from '../layout/AppShell';

export default function LoginPage() {
  const { user, login, notice, clearNotice } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ username: '', password: '' });
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [failure, setFailure] = useState(null);

  if (user) return <Navigate to={HOME_BY_ROLE[user.role]} replace />;

  const submit = async (e) => {
    e.preventDefault();
    const next = {};
    if (!form.username.trim()) next.username = 'Enter your username';
    if (!form.password) next.password = 'Enter your password';
    setErrors(next);
    if (Object.keys(next).length) return;
    setSubmitting(true);
    setFailure(null);
    clearNotice();
    try {
      const u = await login(form.username.trim(), form.password);
      const from = location.state?.from;
      navigate(from && from !== '/login' ? from : HOME_BY_ROLE[u.role], { replace: true });
    } catch (err) {
      if (!err.response) setFailure({ tone: 'bad', title: 'Cannot reach the server', text: errorMessage(err) });
      else if (err.response.status === 401) setFailure({ tone: 'bad', title: 'Sign-in failed', text: 'Invalid username or password.' });
      else setFailure({ tone: 'bad', title: 'Sign-in failed', text: errorMessage(err) });
    } finally {
      setSubmitting(false);
    }
  };

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <div className="grid min-h-screen lg:grid-cols-[1fr_minmax(28rem,36rem)]">
      <section className="hidden flex-col justify-between border-r border-line bg-[#E9EEEC] px-12 py-10 lg:flex">
        <Logo />
        <div className="max-w-lg">
          <h1 className="text-[2rem] font-semibold leading-tight">Patient records, readmissions and ICU beds in one ward system.</h1>
          <p className="mt-4 text-lg text-ink-soft">
            Register patients, run admissions and discharges, flag returns within the readmission window,
            and allocate ICU beds using an advisory priority score.
          </p>
          <dl className="mt-8 grid grid-cols-3 gap-6 border-t border-ink/10 pt-6 text-sm">
            <div><dt className="font-semibold text-ink">Staff</dt><dd className="mt-1 text-ink-muted">Registration, admissions, discharge, ICU requests</dd></div>
            <div><dt className="font-semibold text-ink">Doctors</dt><dd className="mt-1 text-ink-muted">Medical records and readmission risk</dd></div>
            <div><dt className="font-semibold text-ink">Admin</dt><dd className="mt-1 text-ink-muted">Statistics, reports, accounts, audit</dd></div>
          </dl>
        </div>
        <p className="text-xs text-ink-muted">Academic project. All patient data is synthetic. Predictions are advisory and not for clinical decisions.</p>
      </section>

      <section className="flex items-center justify-center px-5 py-10">
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden"><Logo /></div>
          <h2 className="text-2xl font-semibold">Sign in</h2>
          <p className="mt-1 text-sm text-ink-muted">Use the account issued by your hospital administrator.</p>

          <form onSubmit={submit} noValidate className="mt-6 flex flex-col gap-4">
            {notice && !failure && <Alert tone="warn">{notice}</Alert>}
            {failure && <Alert tone={failure.tone} title={failure.title}>{failure.text}</Alert>}
            <Input label="Username" name="username" autoComplete="username" autoFocus value={form.username} onChange={set('username')} error={errors.username} />
            <div className="relative">
              <Input
                label="Password" name="password" type={showPassword ? 'text' : 'password'} autoComplete="current-password"
                value={form.password} onChange={set('password')} error={errors.password} className="[&_input]:pr-11"
              />
              <button
                type="button" onClick={() => setShowPassword((v) => !v)}
                className="absolute right-1.5 top-[1.85rem] rounded p-1.5 text-ink-muted hover:text-ink"
                aria-label={showPassword ? 'Hide password' : 'Show password'} aria-pressed={showPassword}
              >
                {showPassword ? <EyeOff className="h-4 w-4" aria-hidden /> : <Eye className="h-4 w-4" aria-hidden />}
              </button>
            </div>
            <Button type="submit" loading={submitting} icon={LogIn} className="mt-2 w-full">
              {submitting ? 'Signing in' : 'Sign in'}
            </Button>
          </form>
        </div>
      </section>
    </div>
  );
}

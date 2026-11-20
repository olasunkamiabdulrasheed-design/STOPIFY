import { useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowRight, Eye, EyeOff, FlaskConical, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { Button } from '@/components/ui/Button';
import { Field, Input } from '@/components/ui/Input';
import { useAuth } from '@/context/AuthContext';
import { DEMO_EMAIL, DEMO_PASSWORD } from '@/services/authService';
import { errorMessage } from '@/lib/toast';

type AuthMode = 'login' | 'register';

export function LoginPage() {
  return <AuthForm mode="login" />;
}

export function RegisterPage() {
  return <AuthForm mode="register" />;
}

function AuthForm({ mode }: { mode: AuthMode }) {
  const { login, register, loginDemo } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from;

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);

  const isRegister = mode === 'register';
  const busy = loading || demoLoading;

  function destination() {
    return from && from.startsWith('/') ? from : '/dashboard';
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    if (isRegister) {
      if (name.trim().length < 2) {
        setError('Please enter your full name.');
        return;
      }
      if (password.length < 8) {
        setError('Password must be at least 8 characters.');
        return;
      }
      if (password !== confirm) {
        setError('Passwords do not match.');
        return;
      }
    }

    setLoading(true);
    try {
      const user = isRegister
        ? await register(name.trim(), email.trim(), password)
        : await login(email.trim(), password);
      toast.success(
        isRegister
          ? `Welcome, ${user.name.split(' ')[0]}.`
          : `Welcome back, ${user.name.split(' ')[0]}.`,
      );
      navigate(destination(), { replace: true });
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setLoading(false);
    }
  }

  async function onDemo() {
    setError(null);
    setDemoLoading(true);
    try {
      const user = await loginDemo();
      toast.success(`Demo workspace ready, ${user.name.split(' ')[0]}.`);
      navigate('/dashboard', { replace: true });
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setDemoLoading(false);
    }
  }

  return (
    <AuthLayout
      title={isRegister ? 'Create your account' : 'Welcome back'}
      subtitle={
        isRegister
          ? 'Start with a clean workspace. Add a real task and give it a deadline.'
          : 'Sign in to face today’s plan and keep yesterday’s promises.'
      }
      footer={
        <p>
          {isRegister ? 'Already have an account? ' : 'New to STOPIFY? '}
          <Link
            to={isRegister ? '/login' : '/register'}
            className="font-medium text-accent-300 transition hover:text-accent-200"
          >
            {isRegister ? 'Sign in' : 'Create an account'}
          </Link>
        </p>
      }
    >
      <div className="space-y-5">
        {!isRegister ? (
          <div className="rounded-2xl border border-accent-400/20 bg-accent-500/[0.07] p-4">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-accent-400/25 bg-accent-500/10 text-accent-300">
                <Sparkles className="h-4 w-4" aria-hidden />
              </span>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-slate-100">Explore the demo workspace</p>
                <p className="mt-1 text-[11px] leading-relaxed text-slate-400">
                  Loads a clearly labelled sample account and simulated AI. All data stays in this
                  browser.
                </p>
                <Button
                  type="button"
                  size="sm"
                  className="mt-3"
                  loading={demoLoading}
                  disabled={busy}
                  onClick={() => void onDemo()}
                  icon={<FlaskConical className="h-3.5 w-3.5" />}
                >
                  Enter demo workspace
                </Button>
                <p className="mt-2 text-[10px] text-slate-500">
                  Demo credentials: <span className="text-slate-400">{DEMO_EMAIL}</span> ·{' '}
                  <span className="text-slate-400">{DEMO_PASSWORD}</span>
                </p>
              </div>
            </div>
          </div>
        ) : null}

        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          {isRegister ? (
            <Field label="Full name" htmlFor="name" required>
              <Input
                id="name"
                autoComplete="name"
                placeholder="Ada Lovelace"
                value={name}
                onChange={(event) => setName(event.target.value)}
                disabled={busy}
                required
              />
            </Field>
          ) : null}

          <Field label="Email" htmlFor="email" required>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="you@university.edu"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              disabled={busy}
              required
            />
          </Field>

          <Field
            label="Password"
            htmlFor="password"
            required
            hint={isRegister ? 'At least 8 characters.' : undefined}
          >
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete={isRegister ? 'new-password' : 'current-password'}
                placeholder="••••••••"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                disabled={busy}
                className="pr-10"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((value) => !value)}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-slate-500 transition hover:text-slate-300"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </Field>

          {isRegister ? (
            <Field label="Confirm password" htmlFor="confirm" required>
              <Input
                id="confirm"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                placeholder="••••••••"
                value={confirm}
                onChange={(event) => setConfirm(event.target.value)}
                disabled={busy}
                required
              />
            </Field>
          ) : null}

          {!isRegister ? (
            <div className="flex justify-end">
              <Link
                to="/forgot-password"
                className="text-xs font-medium text-slate-400 transition hover:text-accent-300"
              >
                Forgot password?
              </Link>
            </div>
          ) : null}

          {error ? (
            <div className="rounded-xl border border-rose-500/25 bg-rose-500/10 px-3.5 py-3 text-xs leading-relaxed text-rose-200">
              {error}
            </div>
          ) : null}

          <Button type="submit" size="lg" className="w-full" loading={loading} disabled={busy}>
            {loading ? 'Please wait…' : isRegister ? 'Create account' : 'Sign in'}
            {!loading ? <ArrowRight className="h-4 w-4" aria-hidden /> : null}
          </Button>

          <p className="text-center text-[11px] leading-relaxed text-slate-500">
            Demo authentication is stored locally in this browser. It is not a secure production
            account system.
          </p>
        </form>
      </div>
    </AuthLayout>
  );
}

export function ForgotPasswordPage() {
  const { requestPasswordReset } = useAuth();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [resetUrl, setResetUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);
    setResetUrl(null);
    try {
      const result = await requestPasswordReset(email.trim());
      setMessage(result.message);
      if (result.demoResetUrl) setResetUrl(result.demoResetUrl);
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout
      title="Reset your password"
      subtitle="Enter the email on your local account and we’ll prepare a demo reset link."
      footer={
        <p>
          Remembered it?{' '}
          <Link to="/login" className="font-medium text-accent-300 hover:text-accent-200">
            Back to sign in
          </Link>
        </p>
      }
    >
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <Field label="Email" htmlFor="email" required>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="you@university.edu"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            disabled={loading}
            required
          />
        </Field>

        {error ? (
          <div className="rounded-xl border border-rose-500/25 bg-rose-500/10 px-3.5 py-3 text-xs text-rose-200">
            {error}
          </div>
        ) : null}

        {message ? (
          <div className="rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-3 text-xs leading-relaxed text-slate-300">
            {message}
          </div>
        ) : null}

        {resetUrl ? (
          <div className="rounded-xl border border-accent-400/25 bg-accent-500/10 px-3.5 py-3">
            <p className="text-xs font-medium text-accent-100">Demo reset link</p>
            <p className="mt-1 text-[11px] leading-relaxed text-accent-200/80">
              Email delivery is not available in this frontend demo. Use this local link instead. It
              expires in 30 minutes.
            </p>
            <Link
              to={resetUrl.replace(/^https?:\/\/[^/]+/, '')}
              className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-accent-200 underline underline-offset-2 hover:text-white"
            >
              Open reset link <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        ) : null}

        <Button type="submit" size="lg" className="w-full" loading={loading}>
          Prepare reset link
        </Button>
      </form>
    </AuthLayout>
  );
}

export function ResetPasswordPage() {
  const { resetPassword } = useAuth();
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    setLoading(true);
    try {
      await resetPassword(token, password);
      setDone(true);
      toast.success('Password updated. You can sign in now.');
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout
      title="Choose a new password"
      subtitle="Reset links are single-use and expire after 30 minutes."
      footer={
        <p>
          <Link to="/login" className="font-medium text-accent-300 hover:text-accent-200">
            Back to sign in
          </Link>
        </p>
      }
    >
      {!token ? (
        <div className="rounded-xl border border-amber-500/25 bg-amber-500/10 px-3.5 py-3 text-xs leading-relaxed text-amber-100">
          This page needs a reset link. Request a new one from the{' '}
          <Link to="/forgot-password" className="font-semibold underline underline-offset-2">
            forgot password
          </Link>{' '}
          page.
        </div>
      ) : done ? (
        <div className="space-y-4">
          <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-3.5 py-3 text-sm text-emerald-200">
            Your password has been reset successfully.
          </div>
          <Link
            to="/login"
            className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-accent-500 text-sm font-medium text-white transition hover:bg-accent-400"
          >
            Sign in <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          <Field label="New password" htmlFor="password" required hint="At least 8 characters.">
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              disabled={loading}
              required
            />
          </Field>
          <Field label="Confirm new password" htmlFor="confirm" required>
            <Input
              id="confirm"
              type="password"
              autoComplete="new-password"
              value={confirm}
              onChange={(event) => setConfirm(event.target.value)}
              disabled={loading}
              required
            />
          </Field>
          {error ? (
            <div className="rounded-xl border border-rose-500/25 bg-rose-500/10 px-3.5 py-3 text-xs text-rose-200">
              {error}
            </div>
          ) : null}
          <Button type="submit" size="lg" className="w-full" loading={loading}>
            Update password
          </Button>
        </form>
      )}
    </AuthLayout>
  );
}

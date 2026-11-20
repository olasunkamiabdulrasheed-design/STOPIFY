import { Link } from 'react-router-dom';
import { ArrowLeft, Compass, LayoutDashboard } from 'lucide-react';
import { buttonStyles } from '@/components/ui/Button';
import { useAuth } from '@/context/AuthContext';

export function NotFoundPage() {
  const { user } = useAuth();

  return (
    <div className="flex min-h-screen items-center justify-center bg-ink-900 px-5 py-16">
      <div className="w-full max-w-lg text-center">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-accent-400/25 bg-accent-500/10 text-accent-300">
          <Compass className="h-6 w-6" aria-hidden />
        </span>
        <p className="mt-6 text-[11px] font-semibold uppercase tracking-[0.22em] text-accent-300">
          404
        </p>
        <h1 className="mt-2 font-display text-3xl font-bold text-slate-100 sm:text-4xl">
          This page is not on the plan.
        </h1>
        <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-slate-400">
          The URL may be mistyped, or the page may have moved. Your tasks are still where you left
          them — including the ones you were avoiding.
        </p>
        <div className="mt-7 flex flex-col justify-center gap-2 sm:flex-row">
          <Link
            to={user ? '/dashboard' : '/'}
            className={buttonStyles('primary', 'md')}
          >
            {user ? (
              <>
                <LayoutDashboard className="h-4 w-4" aria-hidden /> Go to dashboard
              </>
            ) : (
              <>
                <ArrowLeft className="h-4 w-4" aria-hidden /> Back to home
              </>
            )}
          </Link>
          {user ? (
            <Link to="/tasks" className={buttonStyles('secondary', 'md')}>
              Open task list
            </Link>
          ) : (
            <Link to="/login" className={buttonStyles('secondary', 'md')}>
              Sign in
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

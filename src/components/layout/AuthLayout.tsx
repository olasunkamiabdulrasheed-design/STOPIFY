import { Link } from 'react-router-dom';
import { ArrowRight, Check, ShieldCheck, Sparkles } from 'lucide-react';
import { Logo } from '@/components/ui/Logo';

const bullets = [
  'A task list that records every “later”.',
  'A consequence engine that shows the real cost of delay.',
  'An AI day planner that adapts to what you actually finished.',
];

export function AuthLayout({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="relative flex min-h-screen">
      <div className="relative hidden w-[44%] flex-col justify-between overflow-hidden border-r border-white/[0.06] bg-ink-950/60 p-10 lg:flex xl:p-12">
        <div className="bg-grid absolute inset-0 opacity-70" aria-hidden />
        <div
          className="absolute -left-24 top-1/3 h-72 w-72 rounded-full bg-accent-600/20 blur-3xl"
          aria-hidden
        />
        <div className="relative">
          <Logo asLink size="md" />
        </div>
        <div className="relative max-w-md">
          <div className="inline-flex items-center gap-2 rounded-full border border-accent-400/20 bg-accent-500/10 px-3 py-1 text-[11px] font-medium text-accent-200">
            <Sparkles className="h-3 w-3" aria-hidden />
            Accountability, not another to-do list
          </div>
          <h2 className="mt-5 font-display text-3xl font-bold leading-tight text-slate-100 xl:text-4xl">
            The cost of “later”
            <br />
            becomes impossible to ignore.
          </h2>
          <ul className="mt-7 space-y-3">
            {bullets.map((bullet) => (
              <li key={bullet} className="flex items-start gap-3 text-sm text-slate-300">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent-500/15 text-accent-300">
                  <Check className="h-3 w-3" aria-hidden />
                </span>
                {bullet}
              </li>
            ))}
          </ul>
        </div>
        <div className="relative flex items-center gap-2 text-[11px] text-slate-500">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-400/80" aria-hidden />
          Your data stays in your account. Export or delete it anytime.
        </div>
      </div>

      <div className="relative flex flex-1 flex-col">
        <div className="flex items-center justify-between p-5 lg:hidden">
          <Logo asLink size="sm" />
          <Link to="/" className="text-xs text-slate-400 transition hover:text-slate-200">
            Back to home
          </Link>
        </div>
        <div className="flex flex-1 items-center justify-center px-5 pb-10 pt-4 sm:px-8">
          <div className="w-full max-w-[420px] animate-fade-in">
            <div className="hidden lg:block">
              <Link
                to="/"
                className="mb-8 inline-flex items-center gap-1.5 text-xs text-slate-500 transition hover:text-slate-300"
              >
                <ArrowRight className="h-3 w-3 rotate-180" aria-hidden />
                Back to home
              </Link>
            </div>
            <h1 className="font-display text-2xl font-bold tracking-tight text-slate-100">
              {title}
            </h1>
            <p className="mt-1.5 text-sm leading-relaxed text-slate-400">{subtitle}</p>
            <div className="mt-7">{children}</div>
            {footer ? <div className="mt-6 text-sm text-slate-400">{footer}</div> : null}
          </div>
        </div>
      </div>
    </div>
  );
}

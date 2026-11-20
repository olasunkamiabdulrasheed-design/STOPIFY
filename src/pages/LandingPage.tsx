import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BarChart3,
  Bot,
  CalendarClock,
  Check,
  CheckCircle2,
  Clock,
  Flame,
  History,
  ListChecks,
  Lock,
  NotebookPen,
  Sparkles,
  Target,
  TimerOff,
  TrendingDown,
  Trophy,
  X,
  Zap,
} from 'lucide-react';
import { Logo } from '@/components/ui/Logo';
import { Badge } from '@/components/ui/Badge';
import { Ring } from '@/components/ui/Progress';
import { useAuth } from '@/context/AuthContext';
import { buttonStyles } from '@/components/ui/Button';
import { cn } from '@/lib/utils';

const FAQ_ITEMS = [
  {
    question: 'Is STOPIFY using a real AI model?',
    answer:
      'No. This is the frontend-only hackathon build. Plans, assistant replies and reflection summaries are produced by local rules in your browser using your own tasks and records. Every AI surface is labelled “Simulated AI” so nothing is passed off as a model response.',
  },
  {
    question: 'Where is my data stored?',
    answer:
      'In this browser, using localStorage, scoped to the account you register on this device. Nothing is uploaded and there is no remote database. You can export a JSON copy or delete everything from Settings → Data & privacy.',
  },
  {
    question: 'Do I need an account?',
    answer:
      'Registration is local to this browser. You can create an account, sign in with the demo credentials (demo@stopify.app / stopify-demo), or use “Enter demo workspace” to explore a clearly labelled sample dataset.',
  },
  {
    question: 'How is “time lost” calculated?',
    answer:
      'Recorded deadline extensions plus lateness after the final deadline (or current overdue time for open tasks). Estimated lost work is capped at each task’s own time estimate, so a delay never claims more productive time than the task was expected to take. The full method is explained on Procrastination Insights.',
  },
  {
    question: 'Will the planner overload my day?',
    answer:
      'No. It only schedules your open tasks inside the minutes you provide, respects your focus window, and inserts breaks and buffers. If there is not enough capacity, the remaining work stays unscheduled rather than being squeezed in.',
  },
  {
    question: 'Can I use it on my phone?',
    answer:
      'Yes. The dashboard, task views, planner, insights and settings are responsive, with a dedicated mobile navigation drawer. The interface is designed for both desktop and small screens.',
  },
];

function LandingNav() {
  const { user } = useAuth();
  return (
    <header className="sticky top-0 z-30 border-b border-white/[0.06] bg-ink-950/75 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 sm:px-8">
        <Logo />
        <nav className="hidden items-center gap-7 text-sm text-slate-400 md:flex" aria-label="Landing">
          <a href="#problem" className="transition hover:text-slate-100">
            The problem
          </a>
          <a href="#how-it-works" className="transition hover:text-slate-100">
            How it works
          </a>
          <a href="#features" className="transition hover:text-slate-100">
            Features
          </a>
          <a href="#ai" className="transition hover:text-slate-100">
            AI with receipts
          </a>
          <a href="#faq" className="transition hover:text-slate-100">
            FAQ
          </a>
        </nav>
        <div className="flex items-center gap-2">
          {user ? (
            <Link to="/dashboard" className={buttonStyles('primary', 'md')}>
              Open dashboard <ArrowRight className="h-4 w-4" />
            </Link>
          ) : (
            <>
              <Link
                to="/login"
                className="hidden rounded-lg px-3 py-2 text-sm font-medium text-slate-300 transition hover:bg-white/[0.06] hover:text-white sm:inline-flex"
              >
                Sign in
              </Link>
              <Link to="/register" className={buttonStyles('primary', 'md')}>
                Start free
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

function PreviewTask({
  title,
  meta,
  tone,
  icon: Icon,
}: {
  title: string;
  meta: string;
  tone: 'rose' | 'amber' | 'emerald';
  icon: typeof Flame;
}) {
  const tones = {
    rose: 'border-rose-500/25 bg-rose-500/[0.07] text-rose-300',
    amber: 'border-amber-500/25 bg-amber-500/[0.07] text-amber-300',
    emerald: 'border-emerald-500/25 bg-emerald-500/[0.07] text-emerald-300',
  };
  return (
    <div className="flex items-center gap-3 rounded-xl border border-white/[0.07] bg-ink-900/70 px-3 py-2.5">
      <span className={cn('flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border', tones[tone])}>
        <Icon className="h-3.5 w-3.5" aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-medium text-slate-200">{title}</p>
        <p className={cn('text-[10px]', tone === 'rose' ? 'text-rose-300/80' : 'text-slate-500')}>
          {meta}
        </p>
      </div>
      <span className="rounded-md border border-white/10 bg-white/[0.04] px-1.5 py-0.5 text-[9px] text-slate-500">
        Preview
      </span>
    </div>
  );
}

function HeroPreview() {
  return (
    <div className="relative mx-auto w-full max-w-[480px]">
      <div
        className="absolute -inset-8 rounded-[40px] bg-gradient-to-br from-accent-500/20 via-transparent to-sky-500/10 blur-2xl"
        aria-hidden
      />
      <div className="surface-strong relative overflow-hidden rounded-3xl border-white/[0.12] p-4 sm:p-5">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-rose-400/70" />
            <span className="h-2 w-2 rounded-full bg-amber-400/70" />
            <span className="h-2 w-2 rounded-full bg-emerald-400/70" />
          </div>
          <span className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[10px] text-slate-500">
            Today · product preview
          </span>
        </div>

        <div className="flex items-center gap-4 rounded-2xl border border-white/[0.07] bg-ink-900/60 p-3.5">
          <Ring value={62} size={74} stroke={6}>
            <span className="font-display text-lg font-bold text-slate-100">62</span>
            <span className="text-[8px] uppercase tracking-widest text-slate-500">score</span>
          </Ring>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-slate-100">Momentum score</p>
              <Badge tone="violet">Building</Badge>
            </div>
            <p className="mt-1 text-[11px] leading-relaxed text-slate-400">
              On-time rate <span className="text-slate-200">74%</span> · 3 promises kept this week
            </p>
            <div className="mt-2 flex gap-1">
              {[1, 0.8, 0.6, 0.35, 0.2].map((opacity, index) => (
                <span
                  key={index}
                  className="h-1.5 flex-1 rounded-full bg-accent-400"
                  style={{ opacity }}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="mt-3 space-y-2">
          <PreviewTask
            title="Finish the lab report"
            meta="2 days overdue · 1 postponement"
            tone="rose"
            icon={TimerOff}
          />
          <PreviewTask
            title="Draft thesis outline"
            meta="Postponed 3× · 1h 30m lost"
            tone="amber"
            icon={History}
          />
          <PreviewTask
            title="Review lecture notes"
            meta="Due today, 6:00 PM"
            tone="emerald"
            icon={CheckCircle2}
          />
        </div>

        <div className="mt-3 rounded-xl border border-amber-500/20 bg-amber-500/[0.06] px-3.5 py-3">
          <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-amber-300">
            <TrendingDown className="h-3 w-3" aria-hidden />
            The consequence engine
          </p>
          <p className="mt-1 text-[11px] leading-relaxed text-amber-100/80">
            Your last 4 postponements added <span className="font-semibold text-amber-100">6h 40m</span>{' '}
            of delay. At this pace, the thesis deadline moves again.
          </p>
        </div>

        <div className="mt-3 flex items-center justify-between rounded-xl border border-accent-400/20 bg-accent-500/[0.08] px-3.5 py-2.5">
          <div className="flex items-center gap-2">
            <Sparkles className="h-3.5 w-3.5 text-accent-300" aria-hidden />
            <p className="text-[11px] text-slate-200">Today’s plan is ready — 3 focus blocks</p>
          </div>
          <span className="text-[10px] font-medium text-accent-300">View</span>
        </div>
      </div>

      <div className="absolute -bottom-5 -left-3 hidden rounded-xl border border-white/10 bg-ink-850/95 px-3 py-2 shadow-xl backdrop-blur sm:block">
        <p className="text-[10px] uppercase tracking-wider text-slate-500">Reality check</p>
        <p className="mt-0.5 text-xs font-medium text-slate-200">“Later” has a timestamp now.</p>
      </div>
      <p className="mt-6 text-center text-[10px] text-slate-600">
        Illustrative product preview. Your dashboard is built from your own data.
      </p>
    </div>
  );
}

const problems = [
  {
    icon: Clock,
    title: 'The negotiation',
    body: 'You don’t decide to fail. You decide “after lunch”, then “after one more video”. Each tiny negotiation feels harmless in the moment.',
  },
  {
    icon: TimerOff,
    title: 'The invisible cost',
    body: 'Every postpone quietly moves a deadline and borrows time from your future self. Most apps delete that evidence the moment you click.',
  },
  {
    icon: Target,
    title: 'The abandoned goal',
    body: 'Goals don’t usually die loudly. They fade through a hundred rescheduled tasks, until the target date arrives with nothing to show.',
  },
];

const steps = [
  {
    number: '01',
    title: 'Capture the promise',
    body: 'Add tasks with a deadline, an estimate and the goal they serve. No vague someday items pretending to be work.',
    icon: ListChecks,
  },
  {
    number: '02',
    title: 'Commit to a time',
    body: 'STOPIFY turns your open work into a realistic day plan with focus blocks, buffers and honest capacity limits.',
    icon: CalendarClock,
  },
  {
    number: '03',
    title: 'Confront the delay',
    body: 'When you postpone, you leave a reason and a record. The consequence engine translates that into time lost, at-risk goals and projections.',
    icon: TrendingDown,
  },
  {
    number: '04',
    title: 'Reflect and adjust',
    body: 'Close the day with a reflection. The assistant finds patterns, and tomorrow’s plan starts from reality — not wishful thinking.',
    icon: NotebookPen,
  },
];

const features = [
  {
    icon: TimerOff,
    title: 'A postponement ledger',
    body: 'Every delay keeps its original deadline, new deadline, reason and exact extension. Your task list stops lying to you.',
    tone: 'text-amber-300',
  },
  {
    icon: TrendingDown,
    title: 'Consequence engine',
    body: 'See time added to deadlines, late completions, overdue time, category patterns and risk projections based on your own behaviour.',
    tone: 'text-rose-300',
  },
  {
    icon: CalendarClock,
    title: 'Simulated day planner',
    body: 'A local planning engine respects your available minutes, deadlines and priorities. Mark blocks done as the day moves.',
    tone: 'text-accent-300',
  },
  {
    icon: Bot,
    title: 'A direct assistant',
    body: 'Ask what to do next, why you keep delaying a task, or how to recover a slipping goal. It answers with your real data.',
    tone: 'text-sky-300',
  },
  {
    icon: BarChart3,
    title: 'Truthful analytics',
    body: 'Daily, weekly and monthly trends, weekday patterns, category delay and productivity score breakdowns. No vanity charts.',
    tone: 'text-emerald-300',
  },
  {
    icon: NotebookPen,
    title: 'Daily reflection loop',
    body: 'Log what moved, what stalled and what you learned. Get a summary you can actually use tomorrow.',
    tone: 'text-orange-300',
  },
  {
    icon: Trophy,
    title: 'Earned achievements',
    body: 'Ten achievements for consistency, recovery and planning. Progress is calculated from real events, never gifted.',
    tone: 'text-amber-300',
  },
  {
    icon: Lock,
    title: 'Your account, your data',
    body: 'Private by default, per-user access on every endpoint, plus full JSON export and permanent account deletion.',
    tone: 'text-slate-300',
  },
];

export function LandingPage() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen">
      <LandingNav />

      <main>
        <section className="relative overflow-hidden">
          <div className="bg-grid absolute inset-0" aria-hidden />
          <div
            className="absolute left-1/2 top-0 h-[520px] w-[820px] -translate-x-1/2 rounded-full bg-accent-600/15 blur-[120px]"
            aria-hidden
          />
          <div className="relative mx-auto max-w-7xl px-5 pb-20 pt-14 sm:px-8 lg:pb-28 lg:pt-20">
            <div className="grid items-center gap-14 lg:grid-cols-[1.05fr_0.95fr] lg:gap-10">
              <div className="animate-slide-up">
                <div className="inline-flex items-center gap-2 rounded-full border border-accent-400/25 bg-accent-500/10 px-3 py-1 text-[11px] font-medium text-accent-200">
                  <Sparkles className="h-3 w-3" aria-hidden />
                  Built for people who keep saying “tomorrow”
                </div>
                <h1 className="mt-5 font-display text-[42px] font-extrabold leading-[1.05] tracking-tight text-slate-50 sm:text-6xl lg:text-[64px]">
                  Stop negotiating
                  <br />
                  with yourself.
                  <span className="mt-2 block text-gradient">Start finishing.</span>
                </h1>
                <p className="mt-6 max-w-xl text-base leading-relaxed text-slate-400 sm:text-lg">
                  STOPIFY is a procrastination management demo that tracks not just what you plan,
                  but every time you push it back — then turns that evidence into a plan you can
                  actually follow. Every AI feature is simulated locally in your browser.
                </p>
                <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                  <Link
                    to={user ? '/dashboard' : '/register'}
                    className={buttonStyles('primary', 'lg', 'sm:w-auto')}
                  >
                    {user ? 'Open your dashboard' : 'Start facing your tasks'}
                    <ArrowRight className="h-4 w-4" aria-hidden />
                  </Link>
                  <a
                    href="#how-it-works"
                    className={buttonStyles('secondary', 'lg', 'sm:w-auto')}
                  >
                    See how it works
                  </a>
                </div>
                <div className="mt-7 flex flex-wrap items-center gap-x-5 gap-y-2 text-[11px] text-slate-500">
                  <span className="flex items-center gap-1.5">
                    <Check className="h-3.5 w-3.5 text-emerald-400" aria-hidden /> Free during the
                    hackathon
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Check className="h-3.5 w-3.5 text-emerald-400" aria-hidden /> AI clearly
                    simulated
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Check className="h-3.5 w-3.5 text-emerald-400" aria-hidden /> Export or delete
                    anytime
                  </span>
                </div>
              </div>

              <div className="animate-fade-in lg:pl-4">
                <HeroPreview />
              </div>
            </div>
          </div>
        </section>

        <section className="border-y border-white/[0.06] bg-white/[0.015] py-5">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-x-10 gap-y-3 px-5 text-[11px] uppercase tracking-[0.16em] text-slate-500 sm:px-8">
            <span className="flex items-center gap-2">
              <History className="h-3.5 w-3.5" /> Postponement tracking
            </span>
            <span className="hidden h-1 w-1 rounded-full bg-slate-700 sm:block" />
            <span className="flex items-center gap-2">
              <Zap className="h-3.5 w-3.5" /> Simulated planning
            </span>
            <span className="hidden h-1 w-1 rounded-full bg-slate-700 sm:block" />
            <span className="flex items-center gap-2">
              <BarChart3 className="h-3.5 w-3.5" /> Honest analytics
            </span>
            <span className="hidden h-1 w-1 rounded-full bg-slate-700 sm:block" />
            <span className="flex items-center gap-2">
              <Flame className="h-3.5 w-3.5" /> Streaks with receipts
            </span>
          </div>
        </section>

        <section id="problem" className="mx-auto max-w-7xl scroll-mt-20 px-5 py-20 sm:px-8 lg:py-28">
          <div className="max-w-2xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-accent-300">
              The problem
            </p>
            <h2 className="mt-3 font-display text-3xl font-bold text-slate-100 sm:text-4xl">
              The problem was never the task.
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-slate-400 sm:text-base">
              Most productivity tools optimise for the fantasy version of you — the one who starts
              early and never reschedules. STOPIFY is designed for the real one.
            </p>
          </div>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {problems.map((problem) => (
              <div key={problem.title} className="surface p-6">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-rose-500/20 bg-rose-500/[0.07] text-rose-300">
                  <problem.icon className="h-5 w-5" aria-hidden />
                </div>
                <h3 className="mt-4 font-display text-lg font-semibold text-slate-100">
                  {problem.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-400">{problem.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section
          id="how-it-works"
          className="scroll-mt-20 border-y border-white/[0.06] bg-ink-950/40 py-20 lg:py-28"
        >
          <div className="mx-auto max-w-7xl px-5 sm:px-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div className="max-w-2xl">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-accent-300">
                  How it works
                </p>
                <h2 className="mt-3 font-display text-3xl font-bold text-slate-100 sm:text-4xl">
                  A loop that refuses to forget.
                </h2>
              </div>
              <p className="max-w-sm text-sm leading-relaxed text-slate-400">
                Four steps, repeated daily. The longer you use it, the more honest — and more
                useful — the feedback becomes.
              </p>
            </div>

            <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {steps.map((step) => (
                <div key={step.number} className="relative surface p-5">
                  <div className="flex items-center justify-between">
                    <span className="font-display text-2xl font-bold text-white/10">
                      {step.number}
                    </span>
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-accent-400/20 bg-accent-500/10 text-accent-300">
                      <step.icon className="h-4 w-4" aria-hidden />
                    </span>
                  </div>
                  <h3 className="mt-4 font-display text-base font-semibold text-slate-100">
                    {step.title}
                  </h3>
                  <p className="mt-2 text-xs leading-relaxed text-slate-400">{step.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="features" className="mx-auto max-w-7xl scroll-mt-20 px-5 py-20 sm:px-8 lg:py-28">
          <div className="max-w-2xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-accent-300">
              Features
            </p>
            <h2 className="mt-3 font-display text-3xl font-bold text-slate-100 sm:text-4xl">
              Everything you need to stop lying to your calendar.
            </h2>
          </div>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((feature) => (
              <div key={feature.title} className="surface p-5 transition hover:border-white/[0.14]">
                <feature.icon className={cn('h-5 w-5', feature.tone)} aria-hidden />
                <h3 className="mt-3.5 font-display text-sm font-semibold text-slate-100">
                  {feature.title}
                </h3>
                <p className="mt-1.5 text-xs leading-relaxed text-slate-400">{feature.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="border-y border-white/[0.06] bg-ink-950/40 py-20 lg:py-24">
          <div className="mx-auto grid max-w-7xl items-center gap-12 px-5 sm:px-8 lg:grid-cols-2">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-rose-300">
                The consequence engine
              </p>
              <h2 className="mt-3 font-display text-3xl font-bold text-slate-100 sm:text-4xl">
                Every “later” leaves a receipt.
              </h2>
              <p className="mt-4 text-sm leading-relaxed text-slate-400 sm:text-base">
                When you postpone a task, STOPIFY keeps both deadlines and the reason. The
                consequence engine then calculates the delay you created, what it cost in working
                time, and which goals are now at risk.
              </p>
              <ul className="mt-6 space-y-3">
                {[
                  'Original deadline preserved, never overwritten',
                  'Extension minutes and late-completion time calculated per task',
                  'Projection based on your own last-30-day postponement behaviour',
                  'Goal risk flags when delay accumulates around a target date',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-sm text-slate-300">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" aria-hidden />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="surface-strong overflow-hidden rounded-2xl">
              <div className="flex items-center justify-between border-b border-white/[0.07] px-5 py-3">
                <p className="text-xs font-semibold text-slate-200">Postponement ledger</p>
                <Badge tone="amber">Example</Badge>
              </div>
              <div className="divide-y divide-white/[0.06]">
                <div className="px-5 py-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-medium text-slate-200">Draft research proposal</p>
                    <Badge tone="rose">2 postponements</Badge>
                  </div>
                  <div className="mt-3 space-y-2.5 border-l border-white/10 pl-3">
                    <div className="text-[11px] text-slate-400">
                      <p>
                        Original:{' '}
                        <span className="text-slate-300">Mon 11:59 PM</span> → New:{' '}
                        <span className="text-amber-300">Wed 11:59 PM</span>
                      </p>
                      <p className="mt-0.5 italic text-slate-500">“I’ll do it after the lecture.”</p>
                    </div>
                    <div className="text-[11px] text-slate-400">
                      <p>
                        Original:{' '}
                        <span className="text-slate-300">Wed 11:59 PM</span> → New:{' '}
                        <span className="text-rose-300">Fri 9:00 AM</span>
                      </p>
                      <p className="mt-0.5 italic text-slate-500">“I need a proper block of time.”</p>
                    </div>
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                    <div className="rounded-lg border border-white/[0.07] bg-white/[0.03] px-2 py-1.5">
                      <p className="text-[9px] uppercase tracking-wider text-slate-500">Delay</p>
                      <p className="text-xs font-semibold text-rose-300">33h 1m</p>
                    </div>
                    <div className="rounded-lg border border-white/[0.07] bg-white/[0.03] px-2 py-1.5">
                      <p className="text-[9px] uppercase tracking-wider text-slate-500">Lost time</p>
                      <p className="text-xs font-semibold text-amber-300">2h 45m</p>
                    </div>
                    <div className="rounded-lg border border-white/[0.07] bg-white/[0.03] px-2 py-1.5">
                      <p className="text-[9px] uppercase tracking-wider text-slate-500">Goal</p>
                      <p className="text-xs font-semibold text-rose-300">At risk</p>
                    </div>
                  </div>
                </div>
                <div className="px-5 py-3 text-[10px] leading-relaxed text-slate-500">
                  Illustrative example, not a user statistic. In the app, these values are calculated
                  from your own task and postponement records.
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="ai" className="mx-auto max-w-7xl scroll-mt-20 px-5 py-20 sm:px-8 lg:py-28">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div className="surface-strong relative overflow-hidden p-6 sm:p-8">
              <div
                className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-accent-500/20 blur-3xl"
                aria-hidden
              />
              <div className="relative space-y-4">
                <div className="flex items-center justify-between rounded-xl border border-white/[0.08] bg-ink-950/70 px-4 py-3">
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-slate-500">AI status</p>
                    <p className="mt-0.5 text-sm font-medium text-slate-200">
                      No provider connected
                    </p>
                  </div>
                  <Badge tone="violet">Simulated locally</Badge>
                </div>
                <div className="flex items-center justify-between rounded-xl border border-white/[0.08] bg-ink-950/70 px-4 py-3">
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-slate-500">Engine</p>
                    <p className="mt-0.5 text-sm font-medium text-slate-200">
                      Deterministic planning rules
                    </p>
                  </div>
                  <Badge tone="slate">Browser-only</Badge>
                </div>
                <p className="text-[11px] leading-relaxed text-slate-500">
                  Every generated plan, assistant reply and summary is labelled as simulated.
                </p>
              </div>
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-accent-300">
            Simulated AI
              </p>
              <h2 className="mt-3 font-display text-3xl font-bold text-slate-100 sm:text-4xl">
                Rules you can inspect. Not a black box.
              </h2>
              <p className="mt-4 text-sm leading-relaxed text-slate-400 sm:text-base">
                Every plan, assistant reply and reflection summary is generated locally in your
                browser from your own tasks, deadlines and postponement history. No prompt or
                workspace record leaves this device, and there is no hidden model call.
              </p>
              <div className="mt-6 flex items-start gap-3 rounded-xl border border-amber-500/20 bg-amber-500/[0.06] px-4 py-3.5">
                <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" aria-hidden />
                <p className="text-xs leading-relaxed text-amber-100/80">
                  This build is a frontend demo: no AI provider is connected. The typed service layer
                  is documented so the backend team can add a real model later — until then, every AI
                  surface stays clearly labelled as <span className="font-semibold">simulated</span>.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="border-y border-white/[0.06] bg-ink-950/40 py-16">
          <div className="mx-auto flex max-w-7xl flex-col items-center gap-6 px-5 text-center sm:px-8">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-amber-500/25 bg-amber-500/10 text-amber-300">
              <Trophy className="h-5 w-5" aria-hidden />
            </span>
            <div>
              <h2 className="font-display text-2xl font-bold text-slate-100 sm:text-3xl">
                Earn your momentum back.
              </h2>
              <p className="mx-auto mt-2 max-w-xl text-sm text-slate-400">
                Streaks, recoveries and planning achievements are calculated from real events. When
                you break a streak, the record stays — and the comeback counts.
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              {['First Step', 'Seven Strong', 'Comeback', 'Deep Planner', 'Honest Week'].map(
                (name) => (
                  <span
                    key={name}
                    className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[11px] text-slate-400"
                  >
                    {name}
                  </span>
                ),
              )}
            </div>
          </div>
        </section>

        <section
          id="faq"
          className="mx-auto max-w-4xl scroll-mt-20 px-5 py-20 sm:px-8 lg:py-28"
        >
          <div className="text-center">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-accent-300">
              FAQ
            </p>
            <h2 className="mt-3 font-display text-3xl font-bold text-slate-100 sm:text-4xl">
              Questions worth asking before you start.
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-slate-400">
              Short answers about the demo, your data and the numbers STOPIFY shows you.
            </p>
          </div>

          <div className="mt-10 space-y-3">
            {FAQ_ITEMS.map((item) => (
              <details
                key={item.question}
                className="group rounded-2xl border border-white/[0.07] bg-white/[0.02] px-4 py-3.5 transition hover:border-white/[0.12] sm:px-5"
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-left">
                  <span className="text-sm font-medium text-slate-200">{item.question}</span>
                  <span
                    aria-hidden
                    className="text-lg leading-none text-accent-300 transition-transform group-open:rotate-45"
                  >
                    +
                  </span>
                </summary>
                <p className="mt-3 text-xs leading-relaxed text-slate-400">{item.answer}</p>
              </details>
            ))}
          </div>
        </section>

        <section className="relative overflow-hidden py-20 lg:py-28">
          <div
            className="absolute left-1/2 top-1/2 h-72 w-[700px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent-600/15 blur-[100px]"
            aria-hidden
          />
          <div className="relative mx-auto max-w-3xl px-5 text-center sm:px-8">
            <h2 className="font-display text-3xl font-bold leading-tight text-slate-50 sm:text-5xl">
              Tomorrow is a decision.
              <br />
              <span className="text-gradient">Make it today.</span>
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-slate-400 sm:text-base">
              Add your real tasks, set real deadlines, and let STOPIFY hold up the mirror. The first
              honest week is harder than it looks.
            </p>
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <Link
                to={user ? '/dashboard' : '/register'}
                className={buttonStyles('primary', 'lg')}
              >
                {user ? 'Return to your dashboard' : 'Create your free account'}
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
              <Link to="/login" className={buttonStyles('secondary', 'lg')}>
                I already have an account
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-white/[0.06] bg-ink-950/60">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-5 py-10 sm:px-8 md:flex-row md:items-center md:justify-between">
          <div>
            <Logo size="sm" />
            <p className="mt-2 max-w-xs text-[11px] leading-relaxed text-slate-500">
              A frontend-only procrastination management demo built for the STEM2Connect AI
              Hackathon. AI features are simulated locally.
            </p>
          </div>
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs text-slate-500">
            <a href="#problem" className="transition hover:text-slate-300">
              The problem
            </a>
            <a href="#how-it-works" className="transition hover:text-slate-300">
              How it works
            </a>
            <a href="#features" className="transition hover:text-slate-300">
              Features
            </a>
            <a href="#ai" className="transition hover:text-slate-300">
              Simulated AI
            </a>
            <a href="#faq" className="transition hover:text-slate-300">
              FAQ
            </a>
            <Link to="/login" className="transition hover:text-slate-300">
              Sign in
            </Link>
          </div>
        </div>
        <div className="border-t border-white/[0.05] px-5 py-4 text-center text-[10px] text-slate-600">
          STOPIFY is a planning and reflection tool. It does not provide medical or psychological
          advice. If procrastination is seriously affecting your wellbeing, talk to someone you
          trust or a professional.
        </div>
      </footer>
    </div>
  );
}

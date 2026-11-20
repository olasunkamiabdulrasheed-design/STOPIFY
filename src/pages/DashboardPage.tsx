import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Award,
  CalendarClock,
  CheckCircle2,
  CheckSquare,
  CircleDot,
  Flame,
  Gauge,
  History,
  Plus,
  ShieldCheck,
  Sparkles,
  Target,
  TimerOff,
  TrendingDown,
} from 'lucide-react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button, buttonStyles } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge, SourceBadge, StatusBadge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { Progress, Ring } from '@/components/ui/Progress';
import { PageSkeleton, ErrorState } from '@/components/ui/Loading';
import { ChartFrame, ChartTooltip, axisProps, chartTheme, gridProps } from '@/components/charts/ChartFrame';
import { AchievementIcon } from '@/components/ui/AchievementIcon';
import { TaskFormModal, CompleteTaskModal, PostponeModal } from '@/components/tasks/TaskModals';
import { TaskDetailModal } from '@/components/tasks/TaskDetailModal';
import { useAuth } from '@/context/AuthContext';
import { useWorkspace } from '@/context/WorkspaceContext';
import {
  deadlineInfo,
  formatMinutes,
  formatTime,
  greeting,
  scoreLabel,
  todayLong,
} from '@/lib/utils';
import type { Recommendation, Task } from '@/lib/types';

const toneStyles: Record<Recommendation['tone'], { wrap: string; icon: string }> = {
  urgent: { wrap: 'border-rose-500/25 bg-rose-500/[0.07]', icon: 'text-rose-300' },
  warning: { wrap: 'border-amber-500/25 bg-amber-500/[0.06]', icon: 'text-amber-300' },
  info: { wrap: 'border-sky-500/20 bg-sky-500/[0.05]', icon: 'text-sky-300' },
  positive: { wrap: 'border-emerald-500/25 bg-emerald-500/[0.06]', icon: 'text-emerald-300' },
};

const recommendationIcon = {
  urgent: TimerOff,
  warning: TrendingDown,
  info: Sparkles,
  positive: CheckCircle2,
} as const;

const activityIcon = {
  completed: CheckCircle2,
  created: CircleDot,
  postponed: History,
} as const;

export function DashboardPage() {
  const { user } = useAuth();
  const { snapshot, loading, error } = useWorkspace();
  const [formOpen, setFormOpen] = useState(false);
  const [formTask, setFormTask] = useState<Task | null>(null);
  const [completeTask, setCompleteTask] = useState<Task | null>(null);
  const [postponeTask, setPostponeTask] = useState<Task | null>(null);
  const [detailTask, setDetailTask] = useState<Task | null>(null);

  if (loading) return <PageSkeleton />;
  if (error || !snapshot) {
    return (
      <ErrorState
        message={error ?? 'Could not load your workspace.'}
        onRetry={() => window.location.reload()}
      />
    );
  }

  const { dashboard, summary, score, preferences, goals, achievements, isSampleData } = snapshot;
  const firstName = user?.name.split(' ')[0] ?? 'there';
  const earned = achievements.filter((achievement) => achievement.earned);
  const hasAnyData = summary.totalTasks > 0;
  const todayProgress = preferences.dailyTarget
    ? Math.min(100, Math.round((summary.todayCompleted / preferences.dailyTarget) * 100))
    : 0;
  const activeGoals = goals.filter((goal) => goal.status === 'active').slice(0, 4);

  function openCreate() {
    setFormTask(null);
    setFormOpen(true);
  }

  function openEdit(task: Task) {
    setDetailTask(null);
    setFormTask(task);
    setFormOpen(true);
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        eyebrow={todayLong()}
        title={`${greeting()}, ${firstName}.`}
        description={
          hasAnyData
            ? 'Here is the honest picture of your commitments today.'
            : 'Start with one real task. The mirror only works when there is something to reflect.'
        }
        actions={
          <>
            <Link to="/planner" className={buttonStyles('secondary', 'md')}>
              <CalendarClock className="h-4 w-4" aria-hidden />
              {dashboard.todayPlan ? 'View today’s plan' : 'Plan my day'}
            </Link>
            <Button
              icon={<Plus className="h-4 w-4" />}
              onClick={() => {
                openCreate();
              }}
            >
              Add task
            </Button>
          </>
        }
      />

      {!hasAnyData ? (
        <Card className="p-5 sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-accent-400/25 bg-accent-500/10 text-accent-300">
                <Sparkles className="h-5 w-5" aria-hidden />
              </span>
              <div>
                <h2 className="font-display text-base font-semibold text-slate-100">
                  Your first honest data point
                </h2>
                <p className="mt-1 max-w-xl text-xs leading-relaxed text-slate-400">
                  Add one task with a real deadline and an estimate. Then complete it, postpone it, or
                  miss it — STOPIFY only becomes useful when there is something to measure.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button onClick={openCreate} icon={<Plus className="h-4 w-4" />}>
                Add first task
              </Button>
              <Link to="/goals" className={buttonStyles('outline', 'md')}>
                Create a goal
              </Link>
            </div>
          </div>
        </Card>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="surface flex items-center gap-4 p-4 sm:p-5">
          <Ring value={score.value ?? 0} size={72} stroke={6}>
            <span className="font-display text-xl font-bold text-slate-100">
              {score.value ?? '—'}
            </span>
          </Ring>
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-slate-500">
              <Gauge className="h-3 w-3" aria-hidden /> Momentum
            </p>
            <p className="mt-1 font-display text-lg font-semibold leading-tight text-slate-100">
              {scoreLabel(score.value)}
            </p>
            <p className="mt-1 text-[11px] leading-relaxed text-slate-500">
              {score.reason ?? 'Weighted from delivery, timing and delay.'}
            </p>
          </div>
        </div>

        <StatCard
          icon={CheckCircle2}
          label="On-time rate"
          value={summary.onTimeRate === null ? '—' : `${summary.onTimeRate}%`}
          detail={
            summary.completedWithDeadline > 0
              ? `${summary.onTimeCompleted} of ${summary.completedWithDeadline} dated tasks`
              : 'Complete a dated task to unlock'
          }
          tone="emerald"
        />

        <StatCard
          icon={TimerOff}
          label="Estimated time lost"
          value={formatMinutes(summary.estimatedLostMinutes)}
          detail={
            summary.delayedTasks > 0
              ? `${summary.delayedTasks} delayed ${summary.delayedTasks === 1 ? 'task' : 'tasks'} across ${summary.postponeEvents} postponements`
              : 'No delay recorded yet'
          }
          tone={summary.estimatedLostMinutes > 0 ? 'rose' : 'slate'}
        />

        <StatCard
          icon={Flame}
          label="Current streak"
          value={`${summary.currentStreak} ${summary.currentStreak === 1 ? 'day' : 'days'}`}
          detail={`Longest: ${summary.longestStreak} ${summary.longestStreak === 1 ? 'day' : 'days'}`}
          tone={summary.currentStreak > 0 ? 'amber' : 'slate'}
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard
          icon={CheckSquare}
          label="Total tasks"
          value={String(summary.totalTasks)}
          detail={
            summary.createdLast7 > 0
              ? `${summary.createdLast7} added in the last 7 days`
              : 'Everything you have created'
          }
          tone="slate"
        />
        <StatCard
          icon={CheckCircle2}
          label="Completed"
          value={String(summary.completed)}
          detail={
            summary.completedLast7 > 0
              ? `${summary.completedLast7} finished in the last 7 days`
              : 'No completions yet'
          }
          tone="emerald"
        />
        <StatCard
          icon={CircleDot}
          label="Pending"
          value={String(summary.pending)}
          detail={summary.pending === 0 ? 'Queue is clear' : 'Open and not yet completed'}
          tone="slate"
        />
        <StatCard
          icon={TrendingDown}
          label="Overdue"
          value={String(summary.overdue)}
          detail={
            summary.overdue > 0 ? 'Past their deadline right now' : 'Nothing currently behind'
          }
          tone={summary.overdue > 0 ? 'rose' : 'slate'}
        />
        <StatCard
          icon={History}
          label="Postponed"
          value={String(summary.postponedAny)}
          detail={`${summary.postponeEvents} recorded ${
            summary.postponeEvents === 1 ? 'move' : 'moves'
          }`}
          tone={summary.postponedAny > 0 ? 'amber' : 'slate'}
        />
        <StatCard
          icon={Gauge}
          label="Completion"
          value={`${summary.completionRate}%`}
          detail={`${summary.completed} of ${summary.totalTasks} tasks completed`}
          tone={summary.completionRate >= 50 ? 'emerald' : 'slate'}
        />
      </div>

      {dashboard.recommendations.length > 0 ? (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {dashboard.recommendations.slice(0, 3).map((recommendation) => {
            const Icon = recommendationIcon[recommendation.tone];
            const style = toneStyles[recommendation.tone];
            return (
              <div key={recommendation.id} className={`rounded-2xl border px-4 py-3.5 ${style.wrap}`}>
                <div className="flex items-start gap-2.5">
                  <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${style.icon}`} aria-hidden />
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-slate-100">{recommendation.title}</p>
                    <p className="mt-1 text-[11px] leading-relaxed text-slate-400">
                      {recommendation.body}
                    </p>
                    {recommendation.action ? (
                      <Link
                        to={recommendation.action.href}
                        className={`mt-2 inline-flex items-center gap-1 text-[11px] font-medium ${style.icon} hover:underline`}
                      >
                        {recommendation.action.label}
                        <ArrowRight className="h-3 w-3" aria-hidden />
                      </Link>
                    ) : null}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : null}

      <div className="grid items-start gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card className="p-5 sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  Today
                </p>
                <h2 className="mt-1 font-display text-lg font-semibold text-slate-100">
                  {summary.todayCompleted} of {preferences.dailyTarget} target tasks done
                </h2>
                <p className="mt-1 text-xs text-slate-400">
                  {summary.todayCompleted >= preferences.dailyTarget
                    ? 'Target met. Everything else is a bonus.'
                    : `${Math.max(0, preferences.dailyTarget - summary.todayCompleted)} to go. Focus beats volume.`}
                </p>
              </div>
              {dashboard.todayPlan ? <SourceBadge source={dashboard.todayPlan.source} /> : null}
            </div>
            <Progress
              value={todayProgress}
              className="mt-4 h-2"
              barClassName={todayProgress >= 100 ? 'bg-emerald-500' : 'bg-accent-500'}
              label="Today's target progress"
            />

            <div className="mt-5 border-t border-white/[0.07] pt-4">
              {dashboard.todayPlan ? (
                <>
                  <p className="text-xs leading-relaxed text-slate-400">
                    {dashboard.todayPlan.plan.summary}
                  </p>
                  {dashboard.todayPlan.notice ? (
                    <p className="mt-2 rounded-lg border border-amber-500/20 bg-amber-500/[0.06] px-2.5 py-1.5 text-[10px] leading-relaxed text-amber-200/80">
                      {dashboard.todayPlan.notice}
                    </p>
                  ) : null}
                  <div className="mt-3 space-y-2">
                    {dashboard.todayPlan.plan.items
                      .filter((item) => item.kind === 'focus')
                      .slice(0, 4)
                      .map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2.5"
                        >
                          <span className="w-[92px] shrink-0 text-[11px] tabular-nums text-slate-500">
                            {item.startTime}–{item.endTime}
                          </span>
                          <p
                            className={`min-w-0 flex-1 truncate text-xs ${
                              item.done ? 'text-slate-500 line-through' : 'text-slate-200'
                            }`}
                          >
                            {item.title}
                          </p>
                          {item.done ? (
                            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" aria-hidden />
                          ) : (
                            <span className="shrink-0 text-[10px] text-slate-500">
                              {item.durationMinutes}m
                            </span>
                          )}
                        </div>
                      ))}
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <p className="text-[11px] text-slate-500">
                      {dashboard.todayPlan.doneCount}/{dashboard.todayPlan.itemCount} blocks done
                    </p>
                    <Link
                      to="/planner"
                      className="inline-flex items-center gap-1 text-[11px] font-medium text-accent-300 hover:text-accent-200"
                    >
                      Open planner <ArrowRight className="h-3 w-3" aria-hidden />
                    </Link>
                  </div>
                </>
              ) : (
                <EmptyState
                  icon={CalendarClock}
                  title="No plan for today"
                  description="Generate a plan from your real tasks, deadlines and available time."
                  compact
                  action={
                    <Link to="/planner" className={buttonStyles('primary', 'sm')}>
                      Build today’s plan
                    </Link>
                  }
                />
              )}
            </div>
          </Card>

          <ChartFrame
            title="This week"
            description="Completed versus missed work over the last seven days."
            height={230}
            empty={dashboard.week.every((point) => point.completed === 0 && point.missed === 0)}
            emptyMessage="Complete or miss a dated task to start the chart."
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dashboard.week} barGap={3}>
                <CartesianGrid {...gridProps} />
                <XAxis dataKey="label" {...axisProps} />
                <YAxis allowDecimals={false} width={26} {...axisProps} />
                <Tooltip cursor={{ fill: 'rgba(255,255,255,0.03)' }} content={<ChartTooltip />} />
                <Bar dataKey="completed" name="Completed" fill={chartTheme.emerald} radius={[3, 3, 0, 0]} maxBarSize={22} />
                <Bar dataKey="missed" name="Missed" fill={chartTheme.rose} radius={[3, 3, 0, 0]} maxBarSize={22} />
              </BarChart>
            </ResponsiveContainer>
          </ChartFrame>

          <Card className="p-5 sm:p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="font-display text-base font-semibold text-slate-100">Focus now</h2>
                <p className="mt-1 text-xs text-slate-400">
                  Sorted by urgency, delay history and size of task.
                </p>
              </div>
              <Link
                to="/tasks"
                className="inline-flex items-center gap-1 text-[11px] font-medium text-accent-300 hover:text-accent-200"
              >
                All tasks <ArrowRight className="h-3 w-3" aria-hidden />
              </Link>
            </div>
            <div className="mt-4 space-y-2">
              {dashboard.focusTasks.length === 0 ? (
                <EmptyState
                  icon={CheckSquare}
                  title="Nothing open"
                  description="Add a task to give this list something real to work with."
                  compact
                  action={
                    <Button size="sm" onClick={openCreate} icon={<Plus className="h-3.5 w-3.5" />}>
                      Add task
                    </Button>
                  }
                />
              ) : (
                dashboard.focusTasks.map((task) => {
                  const due = deadlineInfo(task.deadline);
                  return (
                    <div
                      key={task.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => setDetailTask(task)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          setDetailTask(task);
                        }
                      }}
                      className="flex cursor-pointer items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2.5 transition hover:border-white/[0.12] hover:bg-white/[0.04]"
                    >
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          setCompleteTask(task);
                        }}
                        className="group flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-white/20 text-transparent transition hover:border-emerald-400 hover:text-emerald-400"
                        title="Mark complete"
                        aria-label={`Complete ${task.title}`}
                      >
                        <CheckCircle2 className="h-4 w-4" aria-hidden />
                      </button>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-medium text-slate-200">{task.title}</p>
                        <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[10px] text-slate-500">
                          <span
                            className={
                              due.tone === 'overdue'
                                ? 'text-rose-300'
                                : due.tone === 'today'
                                  ? 'text-amber-300'
                                  : undefined
                            }
                          >
                            {due.label}
                          </span>
                          {task.postponeCount > 0 ? (
                            <span className="text-amber-400/80">Postponed {task.postponeCount}×</span>
                          ) : null}
                          <span>{task.category}</span>
                        </p>
                      </div>
                      <StatusBadge status={task.status} />
                    </div>
                  );
                })
              )}
            </div>
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="font-display text-base font-semibold text-slate-100">Goals in motion</h2>
                <p className="mt-1 text-xs text-slate-400">
                  {activeGoals.length === 0
                    ? 'No active goals yet.'
                    : 'Progress is earned by tasks, not wishes.'}
                </p>
              </div>
              <Link
                to="/goals"
                className="rounded-lg p-1.5 text-slate-500 transition hover:bg-white/[0.06] hover:text-slate-200"
                aria-label="All goals"
              >
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            <div className="mt-4 space-y-3.5">
              {activeGoals.length === 0 ? (
                <EmptyState
                  icon={Target}
                  title="Set a goal"
                  description="Give your tasks a direction worth protecting."
                  compact
                  action={
                    <Link to="/goals" className={buttonStyles('secondary', 'sm')}>
                      Create a goal
                    </Link>
                  }
                />
              ) : (
                activeGoals.map((goal) => (
                  <div key={goal.id}>
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-xs font-medium text-slate-200">{goal.title}</p>
                      <span className="shrink-0 text-[11px] tabular-nums text-slate-400">
                        {goal.progress}%
                      </span>
                    </div>
                    <Progress
                      value={goal.progress}
                      className="mt-1.5"
                      barClassName={goal.atRisk ? 'bg-rose-400' : 'bg-accent-500'}
                      label={`${goal.title} progress`}
                    />
                    <p className="mt-1 text-[10px] text-slate-500">
                      {goal.completedCount}/{goal.taskCount} tasks
                      {goal.atRisk ? <span className="text-rose-300"> · at risk</span> : null}
                    </p>
                  </div>
                ))
              )}
            </div>
          </Card>

          <Card className="p-5">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-base font-semibold text-slate-100">Achievements</h2>
              <Badge tone="amber">
                <Award className="h-3 w-3" aria-hidden />
                {earned.length}/{achievements.length}
              </Badge>
            </div>
            <div className="mt-4 grid grid-cols-5 gap-2">
              {achievements.map((achievement) => (
                <div
                  key={achievement.type}
                  title={`${achievement.title} — ${achievement.description}`}
                  className={`flex aspect-square items-center justify-center rounded-xl border ${
                    achievement.earned
                      ? 'border-amber-400/30 bg-amber-500/10 text-amber-300'
                      : 'border-white/[0.06] bg-white/[0.02] text-slate-600'
                  }`}
                >
                  <AchievementIcon name={achievement.icon} className="h-4 w-4" />
                </div>
              ))}
            </div>
            <p className="mt-3 text-[10px] leading-relaxed text-slate-500">
              {earned.length === 0
                ? 'Your first completion unlocks the first achievement.'
                : `Latest: ${earned[earned.length - 1]?.title}. Every badge is earned from real events.`}
            </p>
          </Card>

          <Card className="p-5">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-base font-semibold text-slate-100">Upcoming</h2>
              <Link to="/tasks" className="text-[11px] text-slate-500 hover:text-slate-300">
                View all
              </Link>
            </div>
            <div className="mt-3 space-y-2.5">
              {dashboard.upcoming.length === 0 ? (
                <p className="rounded-xl border border-dashed border-white/10 px-3 py-4 text-center text-[11px] text-slate-500">
                  No dated open tasks.
                </p>
              ) : (
                dashboard.upcoming.slice(0, 5).map((task) => {
                  const due = deadlineInfo(task.deadline);
                  return (
                    <button
                      key={task.id}
                      type="button"
                      onClick={() => setDetailTask(task)}
                      className="flex w-full items-start gap-2.5 rounded-lg px-1 py-1 text-left transition hover:bg-white/[0.03]"
                    >
                      <span
                        className={`mt-1 h-1.5 w-1.5 shrink-0 rounded-full ${
                          due.tone === 'overdue'
                            ? 'bg-rose-400'
                            : due.tone === 'today' || due.tone === 'soon'
                              ? 'bg-amber-400'
                              : 'bg-slate-600'
                        }`}
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-xs text-slate-300">{task.title}</span>
                        <span
                          className={`block text-[10px] ${
                            due.tone === 'overdue' ? 'text-rose-300' : 'text-slate-500'
                          }`}
                        >
                          {due.label}
                          {task.deadline ? ` · ${formatTime(task.deadline)}` : ''}
                        </span>
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          </Card>

          <Card className="p-5">
            <h2 className="font-display text-base font-semibold text-slate-100">Recent activity</h2>
            <div className="mt-3 space-y-3">
              {dashboard.recentActivity.length === 0 ? (
                <p className="text-[11px] text-slate-500">Your timeline starts with your first task.</p>
              ) : (
                dashboard.recentActivity.map((item) => {
                  const Icon = activityIcon[item.type];
                  return (
                    <div key={item.id} className="flex items-start gap-2.5">
                      <span
                        className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border ${
                          item.type === 'completed'
                            ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300'
                            : item.type === 'postponed'
                              ? 'border-amber-500/20 bg-amber-500/10 text-amber-300'
                              : 'border-white/10 bg-white/[0.04] text-slate-400'
                        }`}
                      >
                        <Icon className="h-3 w-3" aria-hidden />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[11px] text-slate-300">{item.title}</p>
                        <p className="text-[10px] text-slate-500">
                          {item.detail ? `${item.detail} · ` : ''}
                          {new Date(item.at).toLocaleString(undefined, {
                            month: 'short',
                            day: 'numeric',
                            hour: 'numeric',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </Card>

          <div className="rounded-2xl border border-accent-400/20 bg-accent-500/[0.06] p-5">
            <div className="flex items-start gap-3">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-accent-300" aria-hidden />
              <div>
                <p className="text-xs font-semibold text-slate-100">
                  {isSampleData ? 'Sample data, simulated AI' : 'Simulated AI, private data'}
                </p>
                <p className="mt-1 text-[11px] leading-relaxed text-slate-400">
                  Plans, summaries and assistant replies are generated locally from your own records.
                  No external AI service is connected. All workspace data is stored in this browser.
                </p>
                <Link
                  to="/settings#demo"
                  className="mt-2 inline-flex items-center gap-1 text-[11px] font-medium text-accent-300 hover:text-accent-200"
                >
                  Demo settings <ArrowRight className="h-3 w-3" aria-hidden />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      <TaskFormModal
        open={formOpen}
        task={formTask}
        onClose={() => {
          setFormOpen(false);
          setFormTask(null);
        }}
      />
      <CompleteTaskModal
        open={Boolean(completeTask)}
        task={completeTask}
        onClose={() => setCompleteTask(null)}
      />
      <PostponeModal
        open={Boolean(postponeTask)}
        task={postponeTask}
        onClose={() => setPostponeTask(null)}
        onPostponed={() => {
          setDetailTask(null);
        }}
      />
      <TaskDetailModal
        open={Boolean(detailTask)}
        task={detailTask}
        onClose={() => setDetailTask(null)}
        onEdit={openEdit}
        onComplete={(task) => {
          setDetailTask(null);
          setCompleteTask(task);
        }}
        onPostpone={(task) => {
          setDetailTask(null);
          setPostponeTask(task);
        }}
      />
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  detail,
  tone,
}: {
  icon: typeof Gauge;
  label: string;
  value: string;
  detail: string;
  tone: 'emerald' | 'rose' | 'amber' | 'slate';
}) {
  const toneClass = {
    emerald: 'border-emerald-500/20 bg-emerald-500/[0.07] text-emerald-300',
    rose: 'border-rose-500/20 bg-rose-500/[0.07] text-rose-300',
    amber: 'border-amber-500/20 bg-amber-500/[0.07] text-amber-300',
    slate: 'border-white/10 bg-white/[0.04] text-slate-400',
  }[tone];

  return (
    <div className="surface p-4 sm:p-5">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-medium uppercase tracking-wider text-slate-500">{label}</p>
        <span className={`flex h-7 w-7 items-center justify-center rounded-lg border ${toneClass}`}>
          <Icon className="h-3.5 w-3.5" aria-hidden />
        </span>
      </div>
      <p className="mt-2.5 font-display text-2xl font-bold tracking-tight text-slate-100">{value}</p>
      <p className="mt-1 text-[11px] leading-relaxed text-slate-500">{detail}</p>
    </div>
  );
}

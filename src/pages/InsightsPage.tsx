import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  Clock,
  Flame,
  Gauge,
  Lightbulb,
  ShieldAlert,
  TimerOff,
  TrendingDown,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { PageHeader } from '@/components/ui/PageHeader';
import { buttonStyles } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge, PriorityBadge, StatusBadge } from '@/components/ui/Badge';
import { Progress } from '@/components/ui/Progress';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageSkeleton, ErrorState } from '@/components/ui/Loading';
import { ChartFrame, ChartTooltip, axisProps, chartTheme, gridProps } from '@/components/charts/ChartFrame';
import { TaskDetailModal } from '@/components/tasks/TaskDetailModal';
import { TaskFormModal, CompleteTaskModal, PostponeModal } from '@/components/tasks/TaskModals';
import { useWorkspace } from '@/context/WorkspaceContext';
import { deadlineInfo, formatMinutes } from '@/lib/utils';
import { formatLongDayKey } from '@/services/dates';
import type { RealityCheck, Task } from '@/lib/types';

const checkTone: Record<
  RealityCheck['tone'],
  { wrap: string; icon: string; Icon: typeof AlertTriangle }
> = {
  urgent: { wrap: 'border-rose-500/25 bg-rose-500/[0.06]', icon: 'text-rose-300', Icon: AlertTriangle },
  warning: { wrap: 'border-amber-500/25 bg-amber-500/[0.06]', icon: 'text-amber-300', Icon: TrendingDown },
  info: { wrap: 'border-sky-500/20 bg-sky-500/[0.05]', icon: 'text-sky-300', Icon: Lightbulb },
  positive: { wrap: 'border-emerald-500/25 bg-emerald-500/[0.06]', icon: 'text-emerald-300', Icon: CheckCircle2 },
};

export function InsightsPage() {
  const { snapshot, loading, error } = useWorkspace();
  const [detailTask, setDetailTask] = useState<Task | null>(null);
  const [formTask, setFormTask] = useState<Task | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [completeTask, setCompleteTask] = useState<Task | null>(null);
  const [postponeTask, setPostponeTask] = useState<Task | null>(null);

  if (loading) return <PageSkeleton />;
  if (error || !snapshot) {
    return <ErrorState message={error ?? 'Could not load your delay insights.'} />;
  }

  const { insights, analytics, summary, tasks } = snapshot;
  const categoryChart = insights.categoryImpact
    .filter((item) => item.estimatedLostMinutes > 0)
    .slice(0, 7)
    .map((item) => ({
      category: item.category,
      lost: item.estimatedLostMinutes,
      events: item.postponeEvents,
    }));
  const projection = insights.projection;
  const oldestOverdue = tasks
    .filter((task) => task.status === 'overdue')
    .sort((a, b) => b.currentOverdueMinutes - a.currentOverdueMinutes)[0];

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        eyebrow="Consequence engine"
        title="Procrastination Insights"
        description="A ledger of every moved deadline, the time it added, and the work it displaced. Calculated locally from your records — no AI estimation."
        actions={
          <Link to="/planner" className={buttonStyles('secondary', 'md')}>
            <CalendarClock className="h-4 w-4" aria-hidden />
            Build a realistic plan
          </Link>
        }
      />

      {!insights.hasData ? (
        <EmptyState
          icon={Gauge}
          title="No data yet"
          description="This page becomes useful when tasks exist, deadlines pass, and postponements are recorded with a reason."
          action={
            <Link to="/tasks" className={buttonStyles('primary', 'md')}>
              Add a task <ArrowRight className="h-4 w-4" />
            </Link>
          }
        />
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <InsightStat
              icon={TimerOff}
              label="Recorded delay"
              value={formatMinutes(insights.timeLost.totalDelayMinutes)}
              detail={`${insights.timeLost.postponeEvents} postponements across ${summary.postponedAny} tasks`}
              tone="rose"
            />
            <InsightStat
              icon={Clock}
              label="Estimated lost work"
              value={formatMinutes(insights.timeLost.estimatedLostMinutes)}
              detail={`Capped at each task’s own estimate · ${insights.timeLost.estimatedLostTaskCount} tasks`}
              tone="amber"
            />
            <InsightStat
              icon={CheckCircle2}
              label="On-time rate"
              value={insights.onTime.rate === null ? '—' : `${insights.onTime.rate}%`}
              detail={
                insights.onTime.completedWithDeadline > 0
                  ? `${insights.onTime.onTimeCompleted}/${insights.onTime.completedWithDeadline} dated tasks on time`
                  : 'No dated tasks completed yet'
              }
              tone="emerald"
            />
            <InsightStat
              icon={Flame}
              label="Overdue right now"
              value={String(summary.overdue)}
              detail={
                summary.overdue > 0
                  ? `${formatMinutes(insights.timeLost.currentOverdueMinutes)} currently past deadline`
                  : 'Nothing is currently behind'
              }
              tone={summary.overdue > 0 ? 'rose' : 'slate'}
            />
          </div>

          <div className="grid items-start gap-4 lg:grid-cols-3">
            <div className="space-y-4 lg:col-span-2">
              <div className="space-y-3">
                <div>
                  <h2 className="font-display text-base font-semibold text-slate-100">Reality checks</h2>
                  <p className="mt-1 text-xs text-slate-400">
                    The specific things your own data says are worth facing.
                  </p>
                </div>
                {insights.realityChecks.length === 0 ? (
                  <p className="rounded-xl border border-dashed border-white/10 px-4 py-5 text-center text-xs text-slate-500">
                    No risk signals right now. Keep deadlines attached to the next real step.
                  </p>
                ) : (
                  <div className="grid gap-3 md:grid-cols-2">
                    {insights.realityChecks.map((check) => {
                      const style = checkTone[check.tone];
                      const Icon = style.Icon;
                      return (
                        <div key={check.id} className={`rounded-2xl border px-4 py-3.5 ${style.wrap}`}>
                          <p className="flex items-center gap-2 text-xs font-semibold text-slate-100">
                            <Icon className={`h-4 w-4 shrink-0 ${style.icon}`} aria-hidden />
                            {check.title}
                          </p>
                          <p className="mt-1.5 text-[11px] leading-relaxed text-slate-400">
                            {check.body}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <ChartFrame
                title="Where the delay lands"
                description="Estimated lost work by category, capped at each task’s own time estimate."
                height={240}
                empty={categoryChart.length === 0}
                emptyMessage="Record a postponement or miss a deadline to see the impact."
              >
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={categoryChart} layout="vertical" margin={{ left: 8, right: 18 }}>
                    <CartesianGrid {...gridProps} vertical horizontal={false} />
                    <XAxis type="number" {...axisProps} tickFormatter={(value) => `${value}m`} />
                    <YAxis
                      type="category"
                      dataKey="category"
                      width={92}
                      {...axisProps}
                      tick={{ fill: chartTheme.axis, fontSize: 11 }}
                    />
                    <Tooltip
                      cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                      content={<ChartTooltip suffix=" min" />}
                    />
                    <Bar dataKey="lost" name="Estimated lost" radius={[0, 5, 5, 0]} maxBarSize={20}>
                      {categoryChart.map((entry, index) => (
                        <Cell
                          key={entry.category}
                          fill={index === 0 ? chartTheme.rose : index === 1 ? chartTheme.amber : chartTheme.accent}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </ChartFrame>

              <Card className="p-5 sm:p-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="font-display text-base font-semibold text-slate-100">Delay ledger</h2>
                    <p className="mt-1 text-xs text-slate-400">
                      Open a task to see every original deadline, new deadline and recorded reason.
                    </p>
                  </div>
                  <Badge tone="amber">{insights.delayHistory.length} delayed tasks</Badge>
                </div>

                <div className="mt-4 space-y-2">
                  {insights.delayHistory.length === 0 ? (
                    <p className="rounded-xl border border-dashed border-white/10 px-4 py-5 text-center text-xs text-slate-500">
                      The ledger is clean. No task currently carries delay.
                    </p>
                  ) : (
                    insights.delayHistory.map((item) => {
                      const task = tasks.find((entry) => entry.id === item.taskId);
                      const due = deadlineInfo(item.currentDeadline);
                      return (
                        <button
                          key={item.taskId}
                          type="button"
                          onClick={() => task && setDetailTask(task)}
                          className="w-full rounded-xl border border-white/[0.07] bg-white/[0.02] px-3.5 py-3 text-left transition hover:border-white/[0.14] hover:bg-white/[0.04]"
                        >
                          <div className="flex flex-wrap items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="truncate text-xs font-medium text-slate-200">{item.title}</p>
                              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-slate-500">
                                <span className="rounded-md border border-white/10 bg-white/[0.03] px-1.5 py-0.5">
                                  {item.category}
                                </span>
                                <span className={due.tone === 'overdue' ? 'text-rose-300' : undefined}>
                                  {due.label}
                                </span>
                                <span>{item.postponeCount} postponements</span>
                                <span>{formatMinutes(item.estimatedLostMinutes)} estimated lost</span>
                              </div>
                              {item.lastReason ? (
                                <p className="mt-1.5 line-clamp-1 text-[10px] italic text-slate-500">
                                  Latest reason: “{item.lastReason}”
                                </p>
                              ) : null}
                            </div>
                            <div className="flex shrink-0 items-center gap-1.5">
                              {task ? <StatusBadge status={task.status} /> : null}
                              {task ? <PriorityBadge priority={task.priority} /> : null}
                            </div>
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              </Card>

              <ChartFrame
                title="Postponements over time"
                description="Recorded moves per day across the last 14 days."
                height={210}
                empty={analytics.daily.every((point) => point.postponed === 0)}
                emptyMessage="No postponements recorded in this period."
              >
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analytics.daily}>
                    <CartesianGrid {...gridProps} />
                    <XAxis dataKey="label" {...axisProps} interval="preserveStartEnd" />
                    <YAxis allowDecimals={false} width={26} {...axisProps} />
                    <Tooltip cursor={{ fill: 'rgba(255,255,255,0.03)' }} content={<ChartTooltip />} />
                    <Bar
                      dataKey="postponed"
                      name="Postponements"
                      fill={chartTheme.amber}
                      radius={[3, 3, 0, 0]}
                      maxBarSize={18}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </ChartFrame>
            </div>

            <div className="space-y-4">
              <Card className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="font-display text-base font-semibold text-slate-100">
                      End-of-month projection
                    </h2>
                    <p className="mt-1 text-xs text-slate-400">
                      A simple extrapolation, not a prophecy.
                    </p>
                  </div>
                  <Badge tone={projection.available ? 'amber' : 'slate'}>
                    {projection.available ? 'Based on data' : 'Locked'}
                  </Badge>
                </div>
                <p className="mt-4 font-display text-3xl font-bold tracking-tight text-slate-100">
                  {projection.available
                    ? `+${formatMinutes(projection.projectedAdditionalDelayMinutes)}`
                    : '—'}
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  {projection.available
                    ? `additional delay projected before ${projection.periodLabel} ends`
                    : projection.reason}
                </p>
                <div className="mt-4 space-y-2 border-t border-white/[0.07] pt-3">
                  {projection.assumptions.map((assumption) => (
                    <p key={assumption} className="flex items-start gap-2 text-[10px] leading-relaxed text-slate-500">
                      <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-slate-600" />
                      {assumption}
                    </p>
                  ))}
                </div>
                <p className="mt-3 text-[10px] text-slate-500">
                  {projection.eventsAnalyzed} events analysed over {projection.windowDays} days ·
                  {' '}{projection.remainingDays} days remaining
                </p>
              </Card>

              <Card className="p-5">
                <h2 className="font-display text-base font-semibold text-slate-100">What it displaced</h2>
                <p className="mt-1 text-xs text-slate-400">{insights.opportunityCost.note}</p>
                {insights.opportunityCost.items.length === 0 ? (
                  <p className="mt-3 rounded-lg border border-dashed border-white/10 px-3 py-4 text-center text-[11px] text-slate-500">
                    No opportunity cost recorded yet.
                  </p>
                ) : (
                  <ul className="mt-3 space-y-2">
                    {insights.opportunityCost.items.map((item) => (
                      <li key={item} className="flex items-start gap-2 text-xs leading-relaxed text-slate-300">
                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent-400" />
                        {item}
                      </li>
                    ))}
                  </ul>
                )}
              </Card>

              <Card className="p-5">
                <h2 className="font-display text-base font-semibold text-slate-100">Goal exposure</h2>
                <p className="mt-1 text-xs text-slate-400">
                  Delay mapped back to the commitments it threatens.
                </p>
                <div className="mt-4 space-y-4">
                  {insights.goalImpact.length === 0 ? (
                    <p className="text-[11px] text-slate-500">No goals defined yet.</p>
                  ) : (
                    insights.goalImpact.map((goal) => (
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
                        <p className="mt-1 text-[10px] leading-relaxed text-slate-500">{goal.message}</p>
                      </div>
                    ))
                  )}
                </div>
              </Card>

              <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4">
                <p className="flex items-center gap-2 text-xs font-semibold text-slate-200">
                  <ShieldAlert className="h-4 w-4 text-accent-300" aria-hidden />
                  How the estimate works
                </p>
                <p className="mt-1.5 text-[10px] leading-relaxed text-slate-500">
                  Delay = deadline extensions + lateness (completed) or current overdue time (open).
                  Estimated lost work is the smaller of that delay and the task’s original estimate.
                  It is a transparent heuristic, not a clinical or financial measurement.
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] px-4 py-3 text-[11px] leading-relaxed text-slate-500">
            You have {summary.pending} open {summary.pending === 1 ? 'task' : 'tasks'}.
            {' '}{oldestOverdue
              ? `The oldest overdue deadline is “${oldestOverdue.title}” (${formatLongDayKey(
                  oldestOverdue.deadline as string,
                )}) — start there instead of adding new work.`
              : 'No overdue items right now; keep the next deadline honest.'}
          </div>
        </>
      )}

      <TaskFormModal
        open={formOpen}
        task={formTask}
        onClose={() => {
          setFormOpen(false);
          setFormTask(null);
        }}
      />
      <TaskDetailModal
        open={Boolean(detailTask)}
        task={detailTask}
        onClose={() => setDetailTask(null)}
        onEdit={(task) => {
          setDetailTask(null);
          setFormTask(task);
          setFormOpen(true);
        }}
        onComplete={(task) => {
          setDetailTask(null);
          setCompleteTask(task);
        }}
        onPostpone={(task) => {
          setDetailTask(null);
          setPostponeTask(task);
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
      />
    </div>
  );
}

function InsightStat({
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
  tone: 'rose' | 'amber' | 'emerald' | 'slate';
}) {
  const toneClass = {
    rose: 'border-rose-500/20 bg-rose-500/[0.07] text-rose-300',
    amber: 'border-amber-500/20 bg-amber-500/[0.07] text-amber-300',
    emerald: 'border-emerald-500/20 bg-emerald-500/[0.07] text-emerald-300',
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

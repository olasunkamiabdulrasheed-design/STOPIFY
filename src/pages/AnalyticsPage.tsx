import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Activity,
  ArrowRight,
  BarChart3,
  CalendarCheck2,
  Flame,
  Gauge,
  Info,
  ShieldCheck,
  TimerOff,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { PageHeader } from '@/components/ui/PageHeader';
import { buttonStyles } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Progress, Ring } from '@/components/ui/Progress';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageSkeleton, ErrorState } from '@/components/ui/Loading';
import { ChartFrame, ChartTooltip, axisProps, chartTheme, gridProps } from '@/components/charts/ChartFrame';
import { useWorkspace } from '@/context/WorkspaceContext';
import { formatMinutes } from '@/lib/utils';
import { cn } from '@/lib/utils';

type Period = 'daily' | 'weekly' | 'monthly';

export function AnalyticsPage() {
  const { snapshot, loading, error } = useWorkspace();
  const [period, setPeriod] = useState<Period>('daily');

  if (loading) return <PageSkeleton />;
  if (error || !snapshot) {
    return <ErrorState message={error ?? 'Could not load analytics.'} />;
  }

  const { analytics, summary, score, goals } = snapshot;
  const hasAnyData =
    summary.totalTasks > 0 ||
    analytics.daily.some((point) => point.completed > 0 || point.postponed > 0);

  const chartData =
    period === 'daily'
      ? analytics.daily.map((point) => ({
          label: point.label,
          completed: point.completed,
          missed: point.missed,
          postponed: point.postponed,
        }))
      : period === 'weekly'
        ? analytics.weekly.map((point) => ({
            label: point.label,
            completed: point.completed,
            onTime: point.onTime,
            missed: point.missed,
          }))
        : analytics.monthly.map((point) => ({
            label: point.label,
            completed: point.completed,
            created: point.created,
            postponed: point.postponed,
          }));

  const series =
    period === 'daily'
      ? [
          { key: 'completed', name: 'Completed', color: chartTheme.emerald },
          { key: 'missed', name: 'Missed', color: chartTheme.rose },
          { key: 'postponed', name: 'Postponed', color: chartTheme.amber },
        ]
      : period === 'weekly'
        ? [
            { key: 'completed', name: 'Completed', color: chartTheme.accent },
            { key: 'onTime', name: 'On time', color: chartTheme.emerald },
            { key: 'missed', name: 'Missed', color: chartTheme.rose },
          ]
        : [
            { key: 'completed', name: 'Completed', color: chartTheme.emerald },
            { key: 'created', name: 'Created', color: chartTheme.sky },
            { key: 'postponed', name: 'Postponed', color: chartTheme.amber },
          ];

  const scoreValue = score.value;
  const scoreLabel =
    scoreValue === null
      ? 'Not enough data'
      : scoreValue >= 80
        ? 'Strong'
        : scoreValue >= 60
          ? 'Steady'
          : scoreValue >= 40
            ? 'Fragile'
            : 'At risk';

  const maxCategoryTotal = Math.max(1, ...analytics.categories.map((item) => item.total));
  const delay = analytics.last7Days;

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        eyebrow="Evidence, not vibes"
        title="Analytics"
        description="Completion, on-time delivery, consistency and the measurable cost of delay. Every chart is computed from your workspace."
        actions={
          <Link to="/insights" className={buttonStyles('secondary', 'md')}>
            <TimerOff className="h-4 w-4" aria-hidden />
            Delay ledger
          </Link>
        }
      />

      {!hasAnyData ? (
        <EmptyState
          icon={BarChart3}
          title="Charts need evidence"
          description="Add tasks, set deadlines and record what happens. Analytics become meaningful after a few real completions and delays."
          action={
            <Link to="/tasks" className={buttonStyles('primary', 'md')}>
              Add your first task <ArrowRight className="h-4 w-4" />
            </Link>
          }
        />
      ) : (
        <>
          <div className="grid items-stretch gap-4 lg:grid-cols-[1fr_1.35fr]">
            <Card className="p-5 sm:p-6">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-display text-base font-semibold text-slate-100">
                    Follow-through score
                  </h2>
                  <p className="mt-1 text-xs text-slate-400">
                    Weighted from on-time, completion, consistency and delay control.
                  </p>
                </div>
                <Badge tone={scoreValue === null ? 'slate' : scoreValue >= 60 ? 'emerald' : 'amber'}>
                  {scoreLabel}
                </Badge>
              </div>

              <div className="mt-5 flex items-center justify-center">
                <Ring value={scoreValue ?? 0} size={168} stroke={11}>
                  <p className="font-display text-4xl font-bold tracking-tight text-slate-100">
                    {scoreValue ?? '—'}
                  </p>
                  <p className="text-[10px] uppercase tracking-wider text-slate-500">out of 100</p>
                </Ring>
              </div>

              {score.reason ? (
                <p className="mt-2 text-center text-[11px] leading-relaxed text-slate-500">
                  {score.reason}
                </p>
              ) : null}

              <div className="mt-5 space-y-3 border-t border-white/[0.07] pt-4">
                {score.breakdown.map((component) => (
                  <div key={component.key}>
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-[11px] font-medium text-slate-300">
                        {component.label}
                        <span className="ml-1.5 text-[10px] font-normal text-slate-500">
                          {Math.round(component.weight * 100)}%
                        </span>
                      </p>
                      <p className="text-[11px] tabular-nums text-slate-400">
                        {component.value === null ? '—' : `${component.value}`}
                      </p>
                    </div>
                    <Progress
                      value={component.value ?? 0}
                      className="mt-1.5"
                      barClassName={
                        component.value === null
                          ? 'bg-slate-600'
                          : component.value >= 60
                            ? 'bg-emerald-400'
                            : 'bg-amber-400'
                      }
                      label={component.label}
                    />
                    <p className="mt-1 text-[10px] leading-relaxed text-slate-500">
                      {component.detail}
                    </p>
                  </div>
                ))}
              </div>
            </Card>

            <div className="grid gap-3 sm:grid-cols-2">
              <StatCard
                icon={CalendarCheck2}
                label="Completion rate"
                value={`${summary.completionRate}%`}
                detail={`${summary.completed} of ${summary.totalTasks} tasks finished`}
                tone="violet"
              />
              <StatCard
                icon={ShieldCheck}
                label="On-time rate"
                value={summary.onTimeRate === null ? '—' : `${summary.onTimeRate}%`}
                detail={
                  summary.completedWithDeadline > 0
                    ? `${summary.onTimeCompleted} of ${summary.completedWithDeadline} dated completions`
                    : 'No dated tasks completed yet'
                }
                tone="emerald"
              />
              <StatCard
                icon={Flame}
                label="Current streak"
                value={`${summary.currentStreak}d`}
                detail={`Longest ${summary.longestStreak} days · active ${summary.activeDaysLast14}/14`}
                tone="amber"
              />
              <StatCard
                icon={Activity}
                label="Last 7 days"
                value={String(summary.completedLast7)}
                detail={`${summary.dueLast7} due · ${summary.postponedLast7} postponed · ${summary.createdLast7} created`}
                tone="sky"
              />
              <div className="surface p-4 sm:col-span-2 sm:p-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-[11px] font-medium uppercase tracking-wider text-slate-500">
                      Cost of delay · last 7 days
                    </p>
                    <p className="mt-1 font-display text-xl font-bold text-slate-100">
                      {formatMinutes(delay.weekAddedMinutes)}
                    </p>
                  </div>
                  <span className="rounded-lg border border-amber-500/20 bg-amber-500/[0.07] px-2 py-1 text-[10px] text-amber-300">
                    {formatMinutes(summary.estimatedLostMinutes)} total estimated lost
                  </span>
                </div>
                <div className="mt-3 space-y-2">
                  <DelayRow label="Deadline extensions" value={delay.extensionMinutes} total={delay.weekAddedMinutes} color="bg-amber-400" />
                  <DelayRow label="Late completions" value={delay.lateCompletionMinutes} total={delay.weekAddedMinutes} color="bg-rose-400" />
                  <DelayRow label="Currently overdue" value={delay.currentOverdueMinutes} total={delay.weekAddedMinutes} color="bg-orange-400" />
                </div>
                <p className="mt-2 text-[10px] leading-relaxed text-slate-500">
                  Components can overlap in interpretation; the figure is a diagnostic, not a precise
                  ledger of minutes. See the Insights page for how each task contributes.
                </p>
              </div>
            </div>
          </div>

          <ChartFrame
            title="Work over time"
            description={
              period === 'daily'
                ? 'Daily completed, missed and postponed work. Postponed is counted on the day of the move.'
                : period === 'weekly'
                  ? 'Weekly completed versus on-time completions and missed deadlines.'
                  : 'Monthly completed versus created work and postponements.'
            }
            height={280}
            action={
              <div className="flex rounded-lg border border-white/10 bg-white/[0.03] p-0.5">
                {(['daily', 'weekly', 'monthly'] as Period[]).map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setPeriod(item)}
                    className={`rounded-md px-2.5 py-1 text-[11px] font-medium capitalize transition ${
                      period === item
                        ? 'bg-white/[0.09] text-slate-100'
                        : 'text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    {item}
                  </button>
                ))}
              </div>
            }
            empty={chartData.every((point) =>
              Object.entries(point).every(([key, value]) => key === 'label' || value === 0),
            )}
            emptyMessage="No activity in this period."
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} barGap={2}>
                <CartesianGrid {...gridProps} />
                <XAxis dataKey="label" {...axisProps} interval="preserveStartEnd" />
                <YAxis allowDecimals={false} width={26} {...axisProps} />
                <Tooltip cursor={{ fill: 'rgba(255,255,255,0.03)' }} content={<ChartTooltip />} />
                <Legend
                  wrapperStyle={{ fontSize: 11, color: chartTheme.axis, paddingTop: 8 }}
                  iconType="circle"
                  iconSize={7}
                />
                {series.map((item) => (
                  <Bar
                    key={item.key}
                    dataKey={item.key}
                    name={item.name}
                    fill={item.color}
                    radius={[3, 3, 0, 0]}
                    maxBarSize={22}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </ChartFrame>

          <div className="grid items-start gap-4 lg:grid-cols-2">
            <ChartFrame
              title="Category performance"
              description="Completion volume and estimated lost work per category."
              height={280}
              empty={analytics.categories.length === 0}
              emptyMessage="No categories yet."
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={analytics.categories.map((item) => ({
                    category: item.category,
                    completed: item.completed,
                    delayed: item.delayed,
                  }))}
                  layout="vertical"
                  margin={{ left: 4, right: 12 }}
                >
                  <CartesianGrid {...gridProps} vertical horizontal={false} />
                  <XAxis type="number" allowDecimals={false} {...axisProps} />
                  <YAxis
                    type="category"
                    dataKey="category"
                    width={88}
                    {...axisProps}
                    tick={{ fill: chartTheme.axis, fontSize: 10 }}
                  />
                  <Tooltip cursor={{ fill: 'rgba(255,255,255,0.03)' }} content={<ChartTooltip />} />
                  <Bar dataKey="completed" name="Completed" stackId="a" fill={chartTheme.emerald} maxBarSize={18} />
                  <Bar
                    dataKey="delayed"
                    name="Delayed"
                    stackId="a"
                    fill={chartTheme.amber}
                    radius={[0, 4, 4, 0]}
                    maxBarSize={18}
                  />
                </BarChart>
              </ResponsiveContainer>
            </ChartFrame>

            <Card className="p-5 sm:p-6">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h2 className="font-display text-sm font-semibold text-slate-100">
                    Where work concentrates
                  </h2>
                  <p className="mt-1 text-xs text-slate-400">
                    Total tasks, completion and delay by category.
                  </p>
                </div>
              </div>
              <div className="mt-4 space-y-3.5">
                {analytics.categories.length === 0 ? (
                  <p className="text-xs text-slate-500">No categories yet.</p>
                ) : (
                  analytics.categories.map((item) => (
                    <div key={item.category}>
                      <div className="flex items-center justify-between gap-2 text-[11px]">
                        <span className="font-medium text-slate-300">{item.category}</span>
                        <span className="tabular-nums text-slate-500">
                          {item.completed}/{item.total} done
                          {item.estimatedLostMinutes > 0
                            ? ` · ${formatMinutes(item.estimatedLostMinutes)} lost`
                            : ''}
                        </span>
                      </div>
                      <div className="mt-1.5 flex h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                        <div
                          className="h-full bg-emerald-400/80"
                          style={{ width: `${(item.completed / maxCategoryTotal) * 100}%` }}
                        />
                        <div
                          className="h-full bg-amber-400/70"
                          style={{ width: `${(item.delayed / maxCategoryTotal) * 100}%` }}
                        />
                        <div
                          className="h-full bg-white/[0.06]"
                          style={{
                            width: `${
                              ((item.total - item.completed - item.delayed) / maxCategoryTotal) * 100
                            }%`,
                          }}
                        />
                      </div>
                    </div>
                  ))
                )}
              </div>
              <div className="mt-4 flex flex-wrap gap-3 border-t border-white/[0.07] pt-3 text-[10px] text-slate-500">
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> Completed
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-400" /> Delayed
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-white/20" /> Pending, on track
                </span>
              </div>
            </Card>
          </div>

          <div className="grid items-start gap-4 lg:grid-cols-2">
            <ChartFrame
              title="Weekday rhythm"
              description="When completions, misses and postponements cluster."
              height={230}
              empty={analytics.weekdays.every(
                (day) => day.completed + day.missed + day.postponed === 0,
              )}
              emptyMessage="No weekday activity yet."
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analytics.weekdays} barGap={2}>
                  <CartesianGrid {...gridProps} />
                  <XAxis dataKey="weekday" {...axisProps} />
                  <YAxis allowDecimals={false} width={26} {...axisProps} />
                  <Tooltip cursor={{ fill: 'rgba(255,255,255,0.03)' }} content={<ChartTooltip />} />
                  <Bar dataKey="completed" name="Completed" fill={chartTheme.emerald} radius={[3, 3, 0, 0]} maxBarSize={18} />
                  <Bar dataKey="missed" name="Missed" fill={chartTheme.rose} radius={[3, 3, 0, 0]} maxBarSize={18} />
                  <Bar dataKey="postponed" name="Postponed" fill={chartTheme.amber} radius={[3, 3, 0, 0]} maxBarSize={18} />
                </BarChart>
              </ResponsiveContainer>
            </ChartFrame>

            <Card className="p-5 sm:p-6">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h2 className="font-display text-sm font-semibold text-slate-100">Consistency</h2>
                  <p className="mt-1 text-xs text-slate-400">
                    Active days over the last fortnight, not perfection.
                  </p>
                </div>
                <Badge tone="violet">{analytics.consistency.score}/100</Badge>
              </div>
              <div className="mt-5 grid grid-cols-[repeat(14,minmax(0,1fr))] gap-1.5">
                {analytics.daily.map((point) => (
                  <div key={point.date} className="flex flex-col items-center gap-1">
                    <div
                      title={`${point.date}: ${point.completed} completed`}
                      className={cn(
                        'h-7 w-full rounded-[3px] border',
                        point.completed > 0
                          ? 'border-accent-400/30 bg-accent-500/50'
                          : point.missed > 0
                            ? 'border-rose-500/20 bg-rose-500/15'
                            : 'border-white/[0.06] bg-white/[0.02]',
                      )}
                    />
                    <span className="text-[8px] text-slate-600">
                      {new Date(`${point.date}T00:00:00`).getDate()}
                    </span>
                  </div>
                ))}
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2 border-t border-white/[0.07] pt-3">
                <MiniMetric label="Active days" value={`${summary.activeDaysLast14}/14`} />
                <MiniMetric label="This week" value={String(summary.completedLast7)} />
                <MiniMetric label="Prev. week" value={String(summary.completedPrev7)} />
              </div>
              <p className="mt-3 text-[10px] leading-relaxed text-slate-500">
                A day counts as active when a task is completed. Streaks are based on consecutive
                active days up to today or yesterday.
              </p>
            </Card>
          </div>

          <Card className="p-5 sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <h2 className="font-display text-sm font-semibold text-slate-100">Goal distribution</h2>
                <p className="mt-1 text-xs text-slate-400">
                  How completed and outstanding work maps to what you said matters.
                </p>
              </div>
              <Link
                to="/goals"
                className="inline-flex items-center gap-1 text-[11px] font-medium text-accent-300 hover:text-accent-200"
              >
                Manage goals <ArrowRight className="h-3 w-3" aria-hidden />
              </Link>
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {goals.length === 0 ? (
                <p className="text-xs text-slate-500">No goals defined yet.</p>
              ) : (
                goals.map((goal) => (
                  <div key={goal.id} className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-3.5">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-xs font-medium text-slate-200">{goal.title}</p>
                      <span className="shrink-0 text-[11px] tabular-nums text-slate-400">
                        {goal.progress}%
                      </span>
                    </div>
                    <Progress
                      value={goal.progress}
                      className="mt-2"
                      barClassName={
                        goal.status === 'completed'
                          ? 'bg-emerald-400'
                          : goal.atRisk
                            ? 'bg-rose-400'
                            : 'bg-accent-500'
                      }
                      label={goal.title}
                    />
                    <p className="mt-1.5 text-[10px] text-slate-500">
                      {goal.completedCount}/{goal.taskCount} tasks
                      {goal.delayedCount > 0 ? ` · ${goal.delayedCount} delayed` : ''}
                      {goal.status === 'completed' ? ' · complete' : ''}
                    </p>
                  </div>
                ))
              )}
            </div>
          </Card>

          <div className="flex items-start gap-2.5 rounded-2xl border border-white/[0.07] bg-white/[0.02] px-4 py-3">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" aria-hidden />
            <p className="text-[11px] leading-relaxed text-slate-500">
              Score weights: on-time delivery 35%, completion 25%, consistency 25%, delay control 15%.
              Components without enough evidence are excluded and the remaining weights are
              re-normalised. Charts use local calendar dates; no data leaves your browser.
            </p>
          </div>
        </>
      )}
    </div>
  );
}

function DelayRow({
  label,
  value,
  total,
  color,
}: {
  label: string;
  value: number;
  total: number;
  color: string;
}) {
  const share = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div>
      <div className="flex items-center justify-between gap-2 text-[10px]">
        <span className="text-slate-500">{label}</span>
        <span className="tabular-nums text-slate-400">
          {formatMinutes(value)} · {share}%
        </span>
      </div>
      <div className="mt-1 h-1 overflow-hidden rounded-full bg-white/[0.06]">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${share}%` }} />
      </div>
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
  tone: 'violet' | 'emerald' | 'amber' | 'sky';
}) {
  const tones = {
    violet: 'border-accent-400/20 bg-accent-500/[0.07] text-accent-300',
    emerald: 'border-emerald-500/20 bg-emerald-500/[0.07] text-emerald-300',
    amber: 'border-amber-500/20 bg-amber-500/[0.07] text-amber-300',
    sky: 'border-sky-500/20 bg-sky-500/[0.07] text-sky-300',
  } as const;
  return (
    <div className="surface p-4 sm:p-5">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-medium uppercase tracking-wider text-slate-500">{label}</p>
        <span className={`flex h-7 w-7 items-center justify-center rounded-lg border ${tones[tone]}`}>
          <Icon className="h-3.5 w-3.5" aria-hidden />
        </span>
      </div>
      <p className="mt-2.5 font-display text-2xl font-bold tracking-tight text-slate-100">{value}</p>
      <p className="mt-1 text-[11px] leading-relaxed text-slate-500">{detail}</p>
    </div>
  );
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-2 py-1.5 text-center">
      <p className="text-[9px] uppercase tracking-wider text-slate-500">{label}</p>
      <p className="mt-0.5 text-xs font-medium tabular-nums text-slate-300">{value}</p>
    </div>
  );
}



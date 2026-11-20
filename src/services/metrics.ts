import type {
  ActivityItem,
  CategoryMetric,
  DailyPoint,
  Goal,
  MonthlyPoint,
  Priority,
  ScoreComponent,
  ScoreResult,
  Summary,
  Task,
  TaskStatus,
  WeekdayMetric,
  WeeklyPoint,
} from '@/lib/types';
import { formatMinutes } from '@/lib/utils';
import type { RawGoal, RawTask } from './types';
import {
  DAY_MS,
  addDays,
  addMonths,
  dayKey,
  daysBetween,
  endOfDay,
  formatMonth,
  formatShortDay,
  formatWeekday,
  minutesBetween,
  monthsAgo,
  startOfDay,
  startOfWeek,
  toDate,
} from './dates';

const PRIORITY_WEIGHT: Record<Priority, number> = {
  low: 1,
  medium: 2,
  high: 3,
  critical: 4,
};

const WEEKDAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export function toTaskView(
  raw: RawTask,
  goalTitleById: Map<string, string>,
  now = new Date(),
): Task {
  const records = [...raw.records]
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    .map((record) => ({
      ...record,
      extensionMinutes: Math.max(0, minutesBetween(record.newDeadline, record.previousDeadline)),
    }));

  const extensionMinutes = records.reduce((total, record) => total + record.extensionMinutes, 0);
  const completedAt = raw.completedAt;
  const deadline = raw.deadline;

  const latenessMinutes =
    completedAt && deadline ? Math.max(0, minutesBetween(completedAt, deadline)) : 0;
  const currentOverdueMinutes =
    !completedAt && deadline ? Math.max(0, minutesBetween(now.toISOString(), deadline)) : 0;

  const delayMinutes = extensionMinutes + (completedAt ? latenessMinutes : currentOverdueMinutes);
  const estimatedLostMinutes =
    delayMinutes > 0 ? Math.min(raw.estimatedDuration ?? 60, delayMinutes) : 0;

  let status: TaskStatus;
  if (completedAt) {
    status = 'completed';
  } else if (deadline && new Date(deadline).getTime() < now.getTime()) {
    status = 'overdue';
  } else {
    status = raw.status;
  }

  return {
    id: raw.id,
    goalId: raw.goalId,
    goalTitle: raw.goalId ? goalTitleById.get(raw.goalId) ?? null : null,
    title: raw.title,
    description: raw.description,
    category: raw.category,
    priority: raw.priority,
    status,
    storedStatus: raw.status,
    deadline,
    estimatedDuration: raw.estimatedDuration,
    actualDuration: raw.actualDuration,
    completedAt,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
    postponeCount: records.length,
    lastPostponedAt: records.length > 0 ? records[records.length - 1].createdAt : null,
    originalDeadline:
      records.length > 0
        ? records[0].previousDeadline
        : deadline,
    extensionMinutes,
    latenessMinutes,
    currentOverdueMinutes,
    delayMinutes,
    estimatedLostMinutes,
    isDelayed: delayMinutes > 0 || records.length > 0,
    records,
  };
}

export function buildTaskViews(
  tasks: RawTask[],
  goals: RawGoal[],
  now = new Date(),
): Task[] {
  const goalTitleById = new Map(goals.map((goal) => [goal.id, goal.title]));
  return tasks.map((task) => toTaskView(task, goalTitleById, now));
}

export function toGoalView(raw: RawGoal, tasks: Task[], now = new Date()): Goal {
  const linked = tasks.filter((task) => task.goalId === raw.id);
  const completedCount = linked.filter((task) => Boolean(task.completedAt)).length;
  const delayedCount = linked.filter((task) => task.isDelayed).length;
  const overdueCount = linked.filter(
    (task) => !task.completedAt && task.deadline && new Date(task.deadline).getTime() < now.getTime(),
  ).length;
  const taskCount = linked.length;
  const progress = taskCount > 0 ? Math.round((completedCount / taskCount) * 100) : 0;
  const daysToTarget = raw.targetDate ? daysBetween(new Date(raw.targetDate), now) : null;
  const atRisk =
    raw.status === 'active' &&
    (overdueCount > 0 ||
      (delayedCount > 0 && (daysToTarget === null || daysToTarget <= 21)));

  return {
    id: raw.id,
    title: raw.title,
    description: raw.description,
    targetDate: raw.targetDate,
    status: raw.status,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
    taskCount,
    completedCount,
    delayedCount,
    overdueCount,
    progress,
    atRisk,
  };
}

function completedOn(task: Task, key: string): boolean {
  return Boolean(task.completedAt && dayKey(new Date(task.completedAt)) === key);
}

function dueOn(task: Task, key: string): boolean {
  return Boolean(task.deadline && dayKey(new Date(task.deadline)) === key);
}

function isOnTime(task: Task): boolean {
  return Boolean(
    task.completedAt &&
      task.deadline &&
      new Date(task.completedAt).getTime() <= new Date(task.deadline).getTime(),
  );
}

function missedDueDay(task: Task, due: Date, now: Date): boolean {
  if (!task.deadline) return false;
  const dueEnd = endOfDay(due);
  if (task.completedAt) {
    return new Date(task.completedAt).getTime() > dueEnd.getTime();
  }
  return dueEnd.getTime() < now.getTime();
}

export function completionDays(tasks: Task[]): string[] {
  return Array.from(
    new Set(
      tasks
        .filter((task) => Boolean(task.completedAt))
        .map((task) => dayKey(new Date(task.completedAt as string))),
    ),
  ).sort();
}

export function computeStreaks(
  tasks: Task[],
  now = new Date(),
): { currentStreak: number; longestStreak: number } {
  const days = completionDays(tasks);
  if (days.length === 0) return { currentStreak: 0, longestStreak: 0 };

  const set = new Set(days);
  let cursor = startOfDay(now);
  if (!set.has(dayKey(cursor))) cursor = addDays(cursor, -1);

  let currentStreak = 0;
  while (set.has(dayKey(cursor))) {
    currentStreak += 1;
    cursor = addDays(cursor, -1);
  }

  let longestStreak = 1;
  let run = 1;
  for (let index = 1; index < days.length; index += 1) {
    const previous = new Date(`${days[index - 1]}T12:00:00`);
    const current = new Date(`${days[index]}T12:00:00`);
    if (Math.round((current.getTime() - previous.getTime()) / DAY_MS) === 1) {
      run += 1;
      longestStreak = Math.max(longestStreak, run);
    } else {
      run = 1;
    }
  }

  return { currentStreak, longestStreak };
}

function activeDays(tasks: Task[], now: Date, windowDays = 14): number {
  const since = addDays(startOfDay(now), -(windowDays - 1)).getTime();
  const keys = new Set<string>();

  for (const task of tasks) {
    const created = toDate(task.createdAt);
    if (created && created.getTime() >= since) keys.add(dayKey(created));
    if (task.completedAt) {
      const completed = toDate(task.completedAt);
      if (completed && completed.getTime() >= since) keys.add(dayKey(completed));
    }
    for (const record of task.records) {
      const at = toDate(record.createdAt);
      if (at && at.getTime() >= since) keys.add(dayKey(at));
    }
  }
  return keys.size;
}

export function summarize(tasks: Task[], now = new Date()): Summary {
  const today = dayKey(now);
  const completedTasks = tasks.filter((task) => Boolean(task.completedAt));
  const completedWithDeadline = completedTasks.filter((task) => Boolean(task.deadline));
  const onTimeCompleted = completedWithDeadline.filter(isOnTime).length;
  const overdue = tasks.filter(
    (task) => !task.completedAt && task.deadline && new Date(task.deadline).getTime() < now.getTime(),
  ).length;
  const postponeEvents = tasks.reduce((total, task) => total + task.records.length, 0);
  const delayedTasks = tasks.filter((task) => task.isDelayed).length;
  const totalDelayMinutes = tasks.reduce((total, task) => total + task.delayMinutes, 0);
  const estimatedLostMinutes = tasks.reduce((total, task) => total + task.estimatedLostMinutes, 0);
  const estimatedLostTaskCount = tasks.filter((task) => task.estimatedLostMinutes > 0).length;
  const streaks = computeStreaks(tasks, now);

  const since7 = addDays(startOfDay(now), -6);
  const since14 = addDays(startOfDay(now), -13);
  const prev7Start = addDays(startOfDay(now), -13);
  const prev7End = addDays(startOfDay(now), -7);

  const completedLast7 = completedTasks.filter((task) => {
    const at = toDate(task.completedAt);
    return at !== null && at >= since7;
  }).length;

  const completedPrev7 = completedTasks.filter((task) => {
    const at = toDate(task.completedAt);
    return at !== null && at >= prev7Start && at < prev7End;
  }).length;

  const dueLast7 = tasks.filter((task) => {
    if (!task.deadline) return false;
    const at = toDate(task.deadline);
    return at !== null && at >= since7;
  }).length;

  const createdLast7 = tasks.filter((task) => {
    const at = toDate(task.createdAt);
    return at !== null && at >= since7;
  }).length;

  const postponedLast7 = tasks.reduce((total, task) => {
    return (
      total +
      task.records.filter((record) => {
        const at = toDate(record.createdAt);
        return at !== null && at >= since7;
      }).length
    );
  }, 0);

  return {
    totalTasks: tasks.length,
    completed: completedTasks.length,
    pending: tasks.length - completedTasks.length,
    overdue,
    postponedOpen: tasks.filter(
      (task) => !task.completedAt && (task.records.length > 0 || task.storedStatus === 'postponed'),
    ).length,
    postponedAny: tasks.filter((task) => task.records.length > 0).length,
    completionRate:
      tasks.length > 0 ? Math.round((completedTasks.length / tasks.length) * 100) : 0,
    onTimeRate:
      completedWithDeadline.length > 0
        ? Math.round((onTimeCompleted / completedWithDeadline.length) * 100)
        : null,
    onTimeCompleted,
    completedWithDeadline: completedWithDeadline.length,
    postponeEvents,
    delayedTasks,
    totalDelayMinutes,
    averageDelayMinutes: delayedTasks > 0 ? Math.round(totalDelayMinutes / delayedTasks) : 0,
    estimatedLostMinutes,
    estimatedLostTaskCount,
    currentStreak: streaks.currentStreak,
    longestStreak: streaks.longestStreak,
    activeDaysLast14: activeDays(tasks, now, 14),
    completedLast7,
    completedPrev7,
    dueLast7,
    createdLast7,
    postponedLast7,
    overdueNow: overdue,
    todayCompleted: completedTasks.filter((task) => completedOn(task, today)).length,
    dueToday: tasks.filter((task) => dueOn(task, today)).length,
  };
}

export function computeScore(
  summary: Summary,
  tasks: Task[],
  now = new Date(),
): ScoreResult {
  const breakdown: ScoreComponent[] = [];

  breakdown.push({
    key: 'on_time',
    label: 'On-time delivery',
    value: summary.onTimeRate,
    weight: 0.35,
    detail:
      summary.completedWithDeadline > 0
        ? `${summary.onTimeCompleted} of ${summary.completedWithDeadline} dated tasks finished on time`
        : 'No dated tasks completed yet',
  });

  breakdown.push({
    key: 'completion',
    label: 'Completion follow-through',
    value: summary.totalTasks > 0 ? summary.completionRate : null,
    weight: 0.25,
    detail:
      summary.totalTasks > 0
        ? `${summary.completed} of ${summary.totalTasks} tasks completed`
        : 'No tasks created yet',
  });

  breakdown.push({
    key: 'consistency',
    label: 'Consistency',
    value: tasks.length > 0 ? Math.round((summary.activeDaysLast14 / 14) * 100) : null,
    weight: 0.25,
    detail:
      tasks.length > 0
        ? `Active on ${summary.activeDaysLast14} of the last 14 days`
        : 'No activity in the last 14 days',
  });

  const delayControl =
    summary.totalTasks > 0
      ? Math.max(
          0,
          Math.min(
            100,
            Math.round(
              100 - (summary.estimatedLostMinutes / Math.max(1, summary.totalTasks * 60)) * 100,
            ),
          ),
        )
      : null;

  breakdown.push({
    key: 'delay_control',
    label: 'Delay control',
    value: delayControl,
    weight: 0.15,
    detail:
      summary.totalTasks > 0
        ? `${formatMinutes(summary.estimatedLostMinutes)} estimated lost across ${summary.delayedTasks} delayed ${
            summary.delayedTasks === 1 ? 'task' : 'tasks'
          }`
        : 'No delay data yet',
  });

  const available = breakdown.filter(
    (component): component is ScoreComponent & { value: number } => component.value !== null,
  );

  if (available.length === 0) {
    return {
      value: null,
      breakdown,
      reason: 'Create and complete tasks to calculate a momentum score.',
    };
  }

  const weightSum = available.reduce((total, component) => total + component.weight, 0);
  const value = Math.round(
    available.reduce((total, component) => total + component.value * component.weight, 0) /
      weightSum,
  );

  void now;
  return { value, breakdown };
}

export function buildDailySeries(
  tasks: Task[],
  now = new Date(),
  days = 14,
): DailyPoint[] {
  const points: DailyPoint[] = [];

  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const date = addDays(startOfDay(now), -offset);
    const key = dayKey(date);
    points.push({
      date: key,
      label: days <= 7 ? formatWeekday(date) : formatShortDay(date),
      completed: tasks.filter((task) => completedOn(task, key)).length,
      due: tasks.filter((task) => dueOn(task, key)).length,
      missed: tasks.filter((task) => {
        if (!task.deadline || dayKey(new Date(task.deadline)) !== key) return false;
        return missedDueDay(task, date, now);
      }).length,
      postponed: tasks.reduce(
        (total, task) =>
          total +
          task.records.filter((record) => dayKey(new Date(record.createdAt)) === key).length,
        0,
      ),
      created: tasks.filter((task) => dayKey(new Date(task.createdAt)) === key).length,
    });
  }

  return points;
}

export function buildWeeklySeries(
  tasks: Task[],
  now = new Date(),
  weeks = 6,
): WeeklyPoint[] {
  const currentWeekStart = startOfWeek(now);
  const points: WeeklyPoint[] = [];

  for (let offset = weeks - 1; offset >= 0; offset -= 1) {
    const weekStart = addDays(currentWeekStart, -offset * 7);
    const weekEnd = addDays(weekStart, 6);
    const end = endOfDay(weekEnd);

    const completed = tasks.filter((task) => {
      const at = toDate(task.completedAt);
      return at !== null && at >= weekStart && at <= end;
    });

    const due = tasks.filter((task) => {
      const at = toDate(task.deadline);
      return at !== null && at >= weekStart && at <= end;
    });

    const missed = due.filter((task) => missedDueDay(task, toDate(task.deadline) as Date, now)).length;

    points.push({
      weekStart: dayKey(weekStart),
      label: formatShortDay(weekStart),
      completed: completed.length,
      onTime: completed.filter(isOnTime).length,
      due: due.length,
      missed,
      postponed: tasks.reduce(
        (total, task) =>
          total +
          task.records.filter((record) => {
            const at = toDate(record.createdAt);
            return at !== null && at >= weekStart && at <= end;
          }).length,
        0,
      ),
    });
  }

  return points;
}

export function buildMonthlySeries(
  tasks: Task[],
  now = new Date(),
  months = 6,
): MonthlyPoint[] {
  const points: MonthlyPoint[] = [];

  for (let offset = months - 1; offset >= 0; offset -= 1) {
    const monthStart = monthsAgo(now, offset);
    const monthEnd = addMonths(monthStart, 1);
    const end = new Date(monthEnd.getTime() - 1);

    points.push({
      month: `${monthStart.getFullYear()}-${String(monthStart.getMonth() + 1).padStart(2, '0')}`,
      label: formatMonth(monthStart),
      completed: tasks.filter((task) => {
        const at = toDate(task.completedAt);
        return at !== null && at >= monthStart && at <= end;
      }).length,
      created: tasks.filter((task) => {
        const at = toDate(task.createdAt);
        return at !== null && at >= monthStart && at <= end;
      }).length,
      postponed: tasks.reduce(
        (total, task) =>
          total +
          task.records.filter((record) => {
            const at = toDate(record.createdAt);
            return at !== null && at >= monthStart && at <= end;
          }).length,
        0,
      ),
    });
  }

  return points;
}

export function buildCategoryMetrics(tasks: Task[]): CategoryMetric[] {
  const map = new Map<string, CategoryMetric>();

  for (const task of tasks) {
    const category = task.category || 'General';
    const existing = map.get(category) ?? {
      category,
      total: 0,
      completed: 0,
      delayed: 0,
      delayMinutes: 0,
      estimatedLostMinutes: 0,
      postponeEvents: 0,
    };
    existing.total += 1;
    if (task.completedAt) existing.completed += 1;
    if (task.isDelayed) existing.delayed += 1;
    existing.delayMinutes += task.delayMinutes;
    existing.estimatedLostMinutes += task.estimatedLostMinutes;
    existing.postponeEvents += task.records.length;
    map.set(category, existing);
  }

  return [...map.values()].sort(
    (a, b) => b.estimatedLostMinutes - a.estimatedLostMinutes || b.total - a.total,
  );
}

export function buildWeekdayMetrics(tasks: Task[], now = new Date()): WeekdayMetric[] {
  const start = addDays(startOfDay(now), -55);
  const metrics = WEEKDAY_LABELS.map((weekday) => ({
    weekday,
    completed: 0,
    missed: 0,
    postponed: 0,
  }));

  for (let offset = 0; offset <= 55; offset += 1) {
    const date = addDays(start, offset);
    const index = (date.getDay() + 6) % 7;
    const key = dayKey(date);
    const bucket = metrics[index];

    bucket.completed += tasks.filter((task) => completedOn(task, key)).length;
    bucket.missed += tasks.filter((task) => {
      if (!task.deadline || dayKey(new Date(task.deadline)) !== key) return false;
      return missedDueDay(task, date, now);
    }).length;
    bucket.postponed += tasks.reduce(
      (total, task) =>
        total + task.records.filter((record) => dayKey(new Date(record.createdAt)) === key).length,
      0,
    );
  }

  return metrics;
}

export function periodDelayMetrics(tasks: Task[], now = new Date(), days = 7) {
  const since = addDays(startOfDay(now), -(days - 1));
  let weekAddedMinutes = 0;
  let lateCompletionMinutes = 0;
  let currentOverdueMinutes = 0;

  for (const task of tasks) {
    for (const record of task.records) {
      const at = toDate(record.createdAt);
      if (at && at >= since) weekAddedMinutes += record.extensionMinutes;
    }
    if (task.completedAt && task.latenessMinutes > 0) {
      const at = toDate(task.completedAt);
      if (at && at >= since) lateCompletionMinutes += task.latenessMinutes;
    }
    if (!task.completedAt) currentOverdueMinutes += task.currentOverdueMinutes;
  }

  return {
    extensionMinutes: tasks.reduce((total, task) => total + task.extensionMinutes, 0),
    weekAddedMinutes,
    lateCompletionMinutes,
    currentOverdueMinutes,
  };
}

export function sortTasksForFocus(tasks: Task[], now = new Date()): Task[] {
  return tasks
    .filter((task) => !task.completedAt)
    .sort((a, b) => {
      const score = (task: Task) => {
        const due = task.deadline ? new Date(task.deadline) : null;
        const isOverdue = due !== null && due.getTime() < now.getTime();
        const days = due ? daysBetween(due, now) : 999;
        return (
          PRIORITY_WEIGHT[task.priority] * 10 +
          (isOverdue ? 100 : 0) +
          (due ? Math.max(0, 30 - days) : 0) +
          task.records.length * 4 +
          Math.min(20, Math.floor(task.currentOverdueMinutes / 1440) * 3)
        );
      };
      return score(b) - score(a);
    });
}

export function buildRecentActivity(tasks: Task[], limit = 8): ActivityItem[] {
  const items: ActivityItem[] = [];

  for (const task of tasks) {
    items.push({
      id: `created-${task.id}`,
      type: 'created',
      title: `Created “${task.title}”`,
      taskId: task.id,
      at: task.createdAt,
    });

    if (task.completedAt) {
      items.push({
        id: `completed-${task.id}`,
        type: 'completed',
        title: `Completed “${task.title}”`,
        taskId: task.id,
        at: task.completedAt,
        detail: task.latenessMinutes > 0 ? 'late' : task.deadline ? 'on time' : undefined,
      });
    }

    for (const record of task.records) {
      items.push({
        id: `postponed-${record.id}`,
        type: 'postponed',
        title: `Postponed “${task.title}”`,
        taskId: task.id,
        at: record.createdAt,
        detail: record.reason || undefined,
      });
    }
  }

  return items
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
    .slice(0, limit);
}


import type {
  CategoryImpact,
  DelayHistoryItem,
  Goal,
  GoalImpact,
  InsightsBundle,
  Recommendation,
  RealityCheck,
  Summary,
  Task,
} from '@/lib/types';
import { formatMinutes, pluralize } from '@/lib/utils';
import { buildCategoryMetrics, periodDelayMetrics } from './metrics';
import { addDays, dayKey, formatLongDayKey, startOfDay, toDate } from './dates';

export function buildProjection(tasks: Task[], now = new Date()): InsightsBundle['projection'] {
  const since = addDays(startOfDay(now), -13);
  const recent = tasks.flatMap((task) =>
    task.records.filter((record) => {
      const at = toDate(record.createdAt);
      return at !== null && at >= since;
    }),
  );

  const extensionMinutes = recent.reduce((total, record) => total + record.extensionMinutes, 0);
  const today = now.getDate();
  const totalDays = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const remainingDays = Math.max(0, totalDays - today);
  const monthLabel = new Intl.DateTimeFormat('en-US', {
    month: 'long',
    year: 'numeric',
  }).format(now);

  const assumptions = [
    'Based on deadline extensions recorded in the last 14 days.',
    `Assumes a similar pace for the remaining ${remainingDays} ${pluralize(remainingDays, 'day')} of ${monthLabel}.`,
    'This is a deliberate simplification, not a forecast of the future.',
  ];

  if (recent.length < 2 || extensionMinutes <= 0 || remainingDays === 0) {
    return {
      available: false,
      reason:
        remainingDays === 0
          ? 'There are no days left in this month to project.'
          : 'Postpone at least two tasks with a later deadline to unlock a projection.',
      projectedAdditionalDelayMinutes: 0,
      eventsAnalyzed: recent.length,
      windowDays: 14,
      remainingDays,
      extensionMinutes,
      periodLabel: monthLabel,
      assumptions,
    };
  }

  return {
    available: true,
    projectedAdditionalDelayMinutes: Math.round((extensionMinutes / 14) * remainingDays),
    eventsAnalyzed: recent.length,
    windowDays: 14,
    remainingDays,
    extensionMinutes,
    periodLabel: monthLabel,
    assumptions,
  };
}

export function buildGoalImpact(goals: Goal[], now = new Date()): GoalImpact[] {
  return goals.map((goal) => {
    let message: string;

    if (goal.status === 'completed') {
      message = `Completed with ${goal.completedCount} of ${goal.taskCount} tasks finished.`;
    } else if (goal.status === 'archived') {
      message = 'Archived. No longer part of your active commitments.';
    } else if (goal.atRisk) {
      const days = goal.targetDate
        ? Math.max(0, Math.round((new Date(goal.targetDate).getTime() - now.getTime()) / 86_400_000))
        : null;
      message = goal.overdueCount > 0
        ? `${goal.overdueCount} overdue ${pluralize(goal.overdueCount, 'task')} and ${goal.delayedCount} delayed ${pluralize(goal.delayedCount, 'item')}.${
            days !== null ? ` Target in ${days} ${pluralize(days, 'day')}.` : ''
          }`
        : `${goal.delayedCount} delayed ${pluralize(goal.delayedCount, 'task')} around this goal.${
            days !== null ? ` Target in ${days} ${pluralize(days, 'day')}.` : ''
          }`;
    } else {
      message = `On track: ${goal.completedCount} of ${goal.taskCount} tasks complete, no overdue work.`;
    }

    return { ...goal, message };
  });
}

export function buildDelayHistory(tasks: Task[]): DelayHistoryItem[] {
  return tasks
    .filter((task) => task.isDelayed)
    .sort((a, b) => b.delayMinutes - a.delayMinutes)
    .map((task) => ({
      taskId: task.id,
      title: task.title,
      category: task.category,
      status: task.status,
      postponeCount: task.postponeCount,
      originalDeadline: task.originalDeadline,
      currentDeadline: task.deadline,
      completedAt: task.completedAt,
      delayMinutes: task.delayMinutes,
      estimatedLostMinutes: task.estimatedLostMinutes,
      lastReason:
        task.records.length > 0 ? task.records[task.records.length - 1].reason : '',
      records: task.records,
    }));
}

export function buildCategoryImpact(tasks: Task[]): CategoryImpact[] {
  const categories = buildCategoryMetrics(tasks);
  const totalLost = categories.reduce((total, category) => total + category.estimatedLostMinutes, 0);
  return categories.map((category) => ({
    ...category,
    share: totalLost > 0 ? Math.round((category.estimatedLostMinutes / totalLost) * 100) : 0,
  }));
}

export function buildOpportunityCost(tasks: Task[], goals: Goal[], summary: Summary) {
  const lost = summary.estimatedLostMinutes;
  if (lost <= 0) {
    return {
      items: [],
      note: 'No estimated lost work yet. Recorded delays will appear here.',
    };
  }

  const sessions = Math.max(1, Math.round(lost / 45));
  const riskyGoal =
    goals.filter((goal) => goal.status === 'active').sort((a, b) => Number(b.atRisk) - Number(a.atRisk))[0] ??
    null;
  const items = [
    `${sessions} focused 45-minute work ${pluralize(sessions, 'block')}`,
    `${formatMinutes(lost)} attached to postponed or late work`,
  ];

  if (riskyGoal) {
    items.push(`${riskyGoal.title} is the goal most exposed to this delay.`);
  } else {
    const mostDelayed = [...tasks].sort((a, b) => b.estimatedLostMinutes - a.estimatedLostMinutes)[0];
    if (mostDelayed && mostDelayed.estimatedLostMinutes > 0) {
      items.push(`“${mostDelayed.title}” accounts for the largest share.`);
    }
  }

  return {
    items,
    note: 'Estimated as the smaller of each task’s estimate and its recorded delay. Treat it as a rough signal, not an exact measurement.',
  };
}

export function buildRealityChecks(
  tasks: Task[],
  goals: Goal[],
  summary: Summary,
  projection: InsightsBundle['projection'],
  categories: CategoryImpact[],
  now = new Date(),
): RealityCheck[] {
  const checks: RealityCheck[] = [];
  const overdue = tasks.filter((task) => task.status === 'overdue');

  if (overdue.length > 0) {
    const first = overdue[0];
    const days = Math.max(1, Math.ceil(first.currentOverdueMinutes / 1440));
    checks.push({
      id: 'overdue',
      tone: 'urgent',
      title: `${overdue.length} ${pluralize(overdue.length, 'deadline has', 'deadlines have')} already passed`,
      body: `“${first.title}” is ${days} ${pluralize(days, 'day')} overdue. Finishing it now still costs less than another reset.`,
      taskId: first.id,
    });
  }

  const mostPostponed = [...tasks].sort((a, b) => b.postponeCount - a.postponeCount)[0];
  if (mostPostponed && mostPostponed.postponeCount >= 2 && !mostPostponed.completedAt) {
    checks.push({
      id: 'repeat-postpone',
      tone: 'warning',
      title: 'You keep renegotiating the same task',
      body: `“${mostPostponed.title}” has been postponed ${mostPostponed.postponeCount} times. The next useful move is a first step of 10 minutes, not a better plan.`,
      taskId: mostPostponed.id,
    });
  }

  if (summary.onTimeRate !== null && summary.onTimeRate < 60 && summary.completedWithDeadline >= 3) {
    checks.push({
      id: 'on-time',
      tone: 'warning',
      title: 'Deadlines are slipping',
      body: `Only ${summary.onTimeCompleted} of ${summary.completedWithDeadline} dated tasks were finished on time. Estimated lost work is ${formatMinutes(summary.estimatedLostMinutes)}.`,
    });
  }

  const topCategory = categories.find((category) => category.estimatedLostMinutes > 0);
  if (topCategory) {
    checks.push({
      id: 'category',
      tone: 'info',
      title: `${topCategory.category} is absorbing the most delay`,
      body: `${topCategory.postponeEvents} ${pluralize(topCategory.postponeEvents, 'postponement')} and ${formatMinutes(
        topCategory.estimatedLostMinutes,
      )} of estimated lost work in this category.`,
    });
  }

  if (projection.available) {
    checks.push({
      id: 'projection',
      tone: 'info',
      title: 'This month has a trajectory',
      body: `At the current pace, recorded extensions could add another ${formatMinutes(
        projection.projectedAdditionalDelayMinutes,
      )} before ${projection.periodLabel} ends.`,
    });
  }

  const riskyGoal = goals.find((goal) => goal.atRisk);
  if (riskyGoal) {
    checks.push({
      id: 'goal-risk',
      tone: 'warning',
      title: `${riskyGoal.title} is at risk`,
      body: `${riskyGoal.delayedCount} delayed or overdue ${pluralize(riskyGoal.delayedCount, 'task')} under this goal. It is ${riskyGoal.progress}% complete.`,
    });
  }

  if (summary.currentStreak >= 3) {
    checks.push({
      id: 'streak',
      tone: 'positive',
      title: `${summary.currentStreak}-day streak`,
      body: `You have completed something for ${summary.currentStreak} consecutive days. The record is yours to keep.`,
    });
  } else if (overdue.length === 0 && summary.completedLast7 > 0) {
    checks.push({
      id: 'clear',
      tone: 'positive',
      title: 'No overdue tasks right now',
      body: `${summary.completedLast7} ${pluralize(summary.completedLast7, 'task')} completed in the last seven days. Keep the buffer.`,
    });
  }

  const order = { urgent: 0, warning: 1, info: 2, positive: 3 };
  return checks.sort((a, b) => order[a.tone] - order[b.tone]).slice(0, 4);
}

export function buildInsights(
  tasks: Task[],
  goals: Goal[],
  summary: Summary,
  now = new Date(),
): InsightsBundle {
  const projection = buildProjection(tasks, now);
  const categories = buildCategoryImpact(tasks);
  const delayHistory = buildDelayHistory(tasks);
  const goalImpact = buildGoalImpact(goals, now);
  const periodMetrics = periodDelayMetrics(tasks, now, 7);
  const monthLabel = new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(now);
  const usedPostponements =
    summary.postponeEvents > 0
      ? `Based on ${summary.postponeEvents} ${pluralize(summary.postponeEvents, 'postponement')} across ${
          summary.postponedAny
        } ${pluralize(summary.postponedAny, 'task')}.`
      : null;

  return {
    generatedAt: now.toISOString(),
    hasData: tasks.length > 0,
    summary,
    timeLost: {
      totalDelayMinutes: summary.totalDelayMinutes,
      estimatedLostMinutes: summary.estimatedLostMinutes,
      estimatedLostTaskCount: summary.estimatedLostTaskCount,
      averageDelayMinutes: summary.averageDelayMinutes,
      delayedTasks: summary.delayedTasks,
      postponeEvents: summary.postponeEvents,
      weekAddedMinutes: periodMetrics.weekAddedMinutes,
      lateCompletionMinutes: periodMetrics.lateCompletionMinutes,
      currentOverdueMinutes: periodMetrics.currentOverdueMinutes,
      extensionMinutes: periodMetrics.extensionMinutes,
    },
    onTime: {
      rate: summary.onTimeRate,
      onTimeCompleted: summary.onTimeCompleted,
      completedWithDeadline: summary.completedWithDeadline,
      completionRate: summary.completionRate,
    },
    projection,
    goalImpact,
    delayHistory,
    categoryImpact: categories,
    opportunityCost: buildOpportunityCost(tasks, goals, summary),
    realityChecks: buildRealityChecks(tasks, goals, summary, projection, categories, now),
    comparison: {
      dueLast7: summary.dueLast7,
      completedLast7: summary.completedLast7,
      postponedLast7: summary.postponedLast7,
      overdueNow: summary.overdueNow,
      createdLast7: summary.createdLast7,
      completionRate: summary.completionRate,
      onTimeRate: summary.onTimeRate,
    },
    periodLabel: monthLabel,
    usedPostponements,
  };
}

export function buildRecommendations(
  tasks: Task[],
  goals: Goal[],
  summary: Summary,
  hasPlanToday: boolean,
  now = new Date(),
): Recommendation[] {
  const recommendations: Recommendation[] = [];

  if (tasks.length === 0) {
    recommendations.push({
      id: 'first-task',
      tone: 'info',
      title: 'Start with one real commitment',
      body: 'Add a task with a deadline and an estimate. STOPIFY needs something concrete to hold you to.',
      action: { label: 'Add your first task', href: '/tasks' },
    });
    recommendations.push({
      id: 'first-goal',
      tone: 'info',
      title: 'Give the work a direction',
      body: 'Create a goal so tasks can be measured against something that matters to you.',
      action: { label: 'Create a goal', href: '/goals' },
    });
    return recommendations;
  }

  const overdue = tasks
    .filter((task) => task.status === 'overdue')
    .sort((a, b) => b.currentOverdueMinutes - a.currentOverdueMinutes);

  if (overdue.length > 0) {
    const first = overdue[0];
    recommendations.push({
      id: 'overdue',
      tone: 'urgent',
      title: `${overdue.length} overdue ${pluralize(overdue.length, 'task')}`,
      body: `Start with “${first.title}”. ${formatMinutes(first.currentOverdueMinutes)} past its deadline and counting.`,
      taskId: first.id,
      action: { label: 'Open task list', href: '/tasks' },
    });
  }

  if (!hasPlanToday) {
    recommendations.push({
      id: 'no-plan',
      tone: 'info',
      title: 'Today has no plan yet',
      body: 'Turn your open tasks into a realistic set of blocks before the day decides for you.',
      action: { label: 'Generate today’s plan', href: '/planner' },
    });
  }

  const mostPostponed = [...tasks]
    .filter((task) => !task.completedAt && task.postponeCount > 0)
    .sort((a, b) => b.postponeCount - a.postponeCount)[0];
  if (mostPostponed) {
    recommendations.push({
      id: 'postpone-pattern',
      tone: 'warning',
      title: 'A task keeps sliding',
      body: `“${mostPostponed.title}” moved ${mostPostponed.postponeCount} ${pluralize(mostPostponed.postponeCount, 'time')}. Shrink the next step instead of moving the deadline again.`,
      action: { label: 'Review delay ledger', href: '/insights' },
    });
  }

  const riskyGoal = goals.find((goal) => goal.atRisk);
  if (riskyGoal) {
    recommendations.push({
      id: 'goal-risk',
      tone: 'warning',
      title: `${riskyGoal.title} needs attention`,
      body: `${riskyGoal.delayedCount} delayed ${pluralize(riskyGoal.delayedCount, 'task')} under this goal. Progress is ${riskyGoal.progress}%.`,
      action: { label: 'Review goals', href: '/goals' },
    });
  }

  if (
    summary.onTimeRate !== null &&
    summary.onTimeRate >= 80 &&
    summary.completedLast7 >= 3 &&
    overdue.length === 0
  ) {
    recommendations.push({
      id: 'positive',
      tone: 'positive',
      title: 'The system is working',
      body: `${summary.completedLast7} tasks finished in the last seven days with ${summary.onTimeRate}% on-time delivery. Protect the routine.`,
      action: { label: 'See analytics', href: '/analytics' },
    });
  }

  if (recommendations.length < 2) {
    const soon = sortUpcoming(tasks, now)[0];
    if (soon) {
      recommendations.push({
        id: 'next-deadline',
        tone: 'info',
        title: 'Next deadline on the board',
        body: `“${soon.title}” is due ${formatLongDayKey(dayKey(new Date(soon.deadline as string)))}. Decide when it happens.`,
        taskId: soon.id,
        action: { label: 'Plan the day', href: '/planner' },
      });
    }
  }

  const order = { urgent: 0, warning: 1, info: 2, positive: 3 };
  return recommendations.sort((a, b) => order[a.tone] - order[b.tone]).slice(0, 4);
}

function sortUpcoming(tasks: Task[], now = new Date()): Task[] {
  return tasks
    .filter((task) => !task.completedAt && task.deadline)
    .filter((task) => new Date(task.deadline as string).getTime() >= now.getTime())
    .sort(
      (a, b) =>
        new Date(a.deadline as string).getTime() - new Date(b.deadline as string).getTime(),
    );
}

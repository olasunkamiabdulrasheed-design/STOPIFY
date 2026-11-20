import type {
  Achievement,
  AchievementState,
  AnalyticsBundle,
  AssistantMessage,
  DashboardBundle,
  Goal,
  InsightsBundle,
  Plan,
  Preferences,
  Profile,
  Reflection,
  ScoreResult,
  Summary,
  Task,
} from '@/lib/types';
import { ACHIEVEMENT_DEFINITIONS, evaluateAchievements } from './achievements';
import { dayKey, formatWeekday } from './dates';
import { buildInsights, buildRecommendations } from './insights';
import {
  buildCategoryMetrics,
  buildDailySeries,
  buildMonthlySeries,
  buildRecentActivity,
  buildTaskViews,
  buildWeekdayMetrics,
  buildWeeklySeries,
  computeScore,
  periodDelayMetrics,
  sortTasksForFocus,
  summarize,
  toGoalView,
} from './metrics';
import type { WorkspaceData } from './types';

export interface WorkspaceSnapshot {
  profile: Profile;
  preferences: Preferences;
  tasks: Task[];
  goals: Goal[];
  plans: Plan[];
  reflections: Reflection[];
  achievements: Achievement[];
  achievementState: AchievementState;
  conversation: AssistantMessage[];
  summary: Summary;
  score: ScoreResult;
  analytics: AnalyticsBundle;
  insights: InsightsBundle;
  dashboard: DashboardBundle;
  isSampleData: boolean;
  updatedAt: string;
  generatedAt: string;
}

export interface SnapshotResult {
  snapshot: WorkspaceSnapshot;
  achievementsChanged: boolean;
}

export function buildSnapshot(workspace: WorkspaceData, now = new Date()): SnapshotResult {
  const tasks = buildTaskViews(workspace.tasks, workspace.goals, now);
  const goals = workspace.goals
    .map((goal) => toGoalView(goal, tasks, now))
    .sort((a, b) => {
      const statusOrder = { active: 0, completed: 1, archived: 2 };
      return (
        statusOrder[a.status] - statusOrder[b.status] ||
        (a.targetDate ?? '9999').localeCompare(b.targetDate ?? '9999')
      );
    });

  const summary = summarize(tasks, now);
  const score = computeScore(summary, tasks, now);
  const evaluation = evaluateAchievements(
    tasks,
    goals,
    workspace.plans.length,
    workspace.reflections.length,
    workspace.achievements,
    summary,
    now,
  );

  const achievementsChanged =
    evaluation.earnedRecords.length !== workspace.achievements.length ||
    evaluation.earnedRecords.some(
      (record) => !workspace.achievements.some((item) => item.type === record.type),
    );

  if (achievementsChanged) {
    workspace.achievements = evaluation.earnedRecords;
  }

  const plans = [...workspace.plans].sort((a, b) => {
    return (
      b.planDate.localeCompare(a.planDate) ||
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  });
  const today = dayKey(now);
  const todayPlan = plans.find((plan) => plan.planDate === today) ?? null;
  const reflections = [...workspace.reflections].sort(
    (a, b) =>
      b.reflectionDate.localeCompare(a.reflectionDate) ||
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  const daily = buildDailySeries(tasks, now, 14);
  const weekly = buildWeeklySeries(tasks, now, 6);
  const monthly = buildMonthlySeries(tasks, now, 6);
  const categories = buildCategoryMetrics(tasks);
  const weekdays = buildWeekdayMetrics(tasks, now);
  const last7 = periodDelayMetrics(tasks, now, 7);
  const insights = buildInsights(tasks, goals, summary, now);
  const recommendations = buildRecommendations(tasks, goals, summary, Boolean(todayPlan), now);

  const upcoming = tasks
    .filter((task) => !task.completedAt && task.deadline)
    .sort(
      (a, b) =>
        new Date(a.deadline as string).getTime() - new Date(b.deadline as string).getTime(),
    )
    .slice(0, 6);

  const analytics: AnalyticsBundle = {
    daily,
    weekly,
    monthly,
    categories,
    weekdays,
    last7Days: {
      extensionMinutes: last7.extensionMinutes,
      lateCompletionMinutes: last7.lateCompletionMinutes,
      currentOverdueMinutes: last7.currentOverdueMinutes,
      weekAddedMinutes: last7.weekAddedMinutes,
    },
    consistency: {
      activeDaysLast14: summary.activeDaysLast14,
      score:
        tasks.length > 0 ? Math.round((summary.activeDaysLast14 / 14) * 100) : 0,
    },
  };

  const dashboard: DashboardBundle = {
    todayPlan,
    upcoming,
    focusTasks: sortTasksForFocus(tasks, now).slice(0, 4),
    recommendations,
    recentActivity: buildRecentActivity(tasks, 6),
    week: daily.slice(-7).map((point, index) => ({
      ...point,
      label: index === 6 ? 'Today' : formatWeekday(new Date(`${point.date}T12:00:00`)),
    })),
  };

  const achievementState: AchievementState = {
    achievements: evaluation.achievements,
    earnedCount: evaluation.earnedRecords.length,
    totalCount: ACHIEVEMENT_DEFINITIONS.length,
  };

  const snapshot: WorkspaceSnapshot = {
    profile: {
      ...workspace.profile,
      preferences: workspace.preferences,
    },
    preferences: workspace.preferences,
    tasks,
    goals,
    plans,
    reflections,
    achievements: evaluation.achievements,
    achievementState,
    conversation: workspace.conversations.slice(-100),
    summary,
    score,
    analytics,
    insights,
    dashboard,
    isSampleData: workspace.isSampleData,
    updatedAt: workspace.updatedAt,
    generatedAt: now.toISOString(),
  };

  return { snapshot, achievementsChanged };
}

import type { Achievement, AchievementDefinition, Goal, Summary, Task } from '@/lib/types';
import type { EarnedAchievement } from './types';

export const ACHIEVEMENT_DEFINITIONS: AchievementDefinition[] = [
  {
    type: 'first_step',
    title: 'First Step',
    description: 'Complete your first task.',
    icon: 'sparkles',
    tier: 'starter',
  },
  {
    type: 'ten_tasks',
    title: 'Getting Things Done',
    description: 'Complete 10 tasks.',
    icon: 'check-circle',
    tier: 'starter',
  },
  {
    type: 'streak_3',
    title: 'Three-Day Consistency',
    description: 'Complete at least one task on three consecutive days.',
    icon: 'flame',
    tier: 'consistency',
  },
  {
    type: 'streak_7',
    title: 'Seven Days of Progress',
    description: 'Reach a seven-day completion streak.',
    icon: 'trophy',
    tier: 'consistency',
  },
  {
    type: 'procrastination_fighter',
    title: 'Procrastination Fighter',
    description: 'Complete three tasks that had been postponed.',
    icon: 'shield',
    tier: 'recovery',
  },
  {
    type: 'on_time_5',
    title: 'On-Time Achiever',
    description: 'Finish five dated tasks on or before their deadline.',
    icon: 'calendar-check',
    tier: 'recovery',
  },
  {
    type: 'weekly_goal',
    title: 'Weekly Goal Achiever',
    description: 'Complete seven tasks within seven days.',
    icon: 'target',
    tier: 'consistency',
  },
  {
    type: 'planner',
    title: 'Plan Maker',
    description: 'Generate your first daily plan.',
    icon: 'brain',
    tier: 'planning',
  },
  {
    type: 'reflector',
    title: 'Reflective Thinker',
    description: 'Save three daily reflections.',
    icon: 'notebook',
    tier: 'planning',
  },
  {
    type: 'goal_getter',
    title: 'Goal Getter',
    description: 'Complete a personal goal.',
    icon: 'rocket',
    tier: 'starter',
  },
];

export interface AchievementEvaluation {
  achievements: Achievement[];
  earnedRecords: EarnedAchievement[];
  newlyEarned: Achievement[];
}

export function evaluateAchievements(
  tasks: Task[],
  goals: Goal[],
  planCount: number,
  reflectionCount: number,
  existing: EarnedAchievement[],
  summary: Summary,
  now = new Date(),
): AchievementEvaluation {
  const earnedMap = new Map(existing.map((record) => [record.type, record.earnedAt]));
  const completedWithPostponements = tasks.filter(
    (task) => task.completedAt && task.records.length > 0,
  ).length;
  const completedGoals = goals.filter((goal) => goal.status === 'completed').length;

  const progress = new Map<string, { current: number; target: number }>([
    ['first_step', { current: Math.min(summary.completed, 1), target: 1 }],
    ['ten_tasks', { current: Math.min(summary.completed, 10), target: 10 }],
    ['streak_3', { current: Math.min(summary.longestStreak, 3), target: 3 }],
    ['streak_7', { current: Math.min(summary.longestStreak, 7), target: 7 }],
    [
      'procrastination_fighter',
      { current: Math.min(completedWithPostponements, 3), target: 3 },
    ],
    ['on_time_5', { current: Math.min(summary.onTimeCompleted, 5), target: 5 }],
    ['weekly_goal', { current: Math.min(summary.completedLast7, 7), target: 7 }],
    ['planner', { current: Math.min(planCount, 1), target: 1 }],
    ['reflector', { current: Math.min(reflectionCount, 3), target: 3 }],
    ['goal_getter', { current: Math.min(completedGoals, 1), target: 1 }],
  ]);

  const newlyEarned: Achievement[] = [];
  const earnedRecords = [...existing];

  const achievements: Achievement[] = ACHIEVEMENT_DEFINITIONS.map((definition) => {
    const taskProgress = progress.get(definition.type) ?? { current: 0, target: 1 };
    const met = taskProgress.current >= taskProgress.target;

    if (met && !earnedMap.has(definition.type)) {
      earnedMap.set(definition.type, now.toISOString());
      earnedRecords.push({ type: definition.type, earnedAt: now.toISOString() });
    }

    const earnedAt = earnedMap.get(definition.type) ?? null;
    const achievement: Achievement = {
      ...definition,
      earned: Boolean(earnedAt),
      earnedAt,
      progress: {
        current: Math.min(taskProgress.current, taskProgress.target),
        target: taskProgress.target,
      },
    };
    if (achievement.earned && !existing.some((record) => record.type === definition.type)) {
      newlyEarned.push(achievement);
    }
    return achievement;
  });

  return { achievements, earnedRecords, newlyEarned };
}

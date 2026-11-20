import type { Goal, Reflection, ReflectionContext, Task } from '@/lib/types';
import { dayKey } from './dates';
import { sortTasksForFocus } from './metrics';

export interface ReflectionContextInput {
  /** A validated `YYYY-MM-DD` key. */
  date: string;
  tasks: Task[];
  goals: Goal[];
  reflections: Reflection[];
  now?: Date;
}

/**
 * Builds the daily check-in context from task and goal views.
 *
 * Shared by the local and HTTP workspace services so both modes show the same
 * reflection screen for a given day.
 */
export function buildReflectionContext({
  date,
  tasks,
  goals,
  reflections,
  now = new Date(),
}: ReflectionContextInput): ReflectionContext {
  const completed = tasks.filter(
    (task) => task.completedAt && dayKey(new Date(task.completedAt)) === date,
  );

  const postponed = tasks.flatMap((task) =>
    task.records
      .filter((record) => dayKey(new Date(record.createdAt)) === date)
      .map((record) => ({
        id: record.id,
        taskId: task.id,
        title: task.title,
        reason: record.reason,
        createdAt: record.createdAt,
      })),
  );

  const openTasks = tasks.filter((task) => !task.completedAt);
  const suggested = sortTasksForFocus(openTasks, now)
    .slice(0, 3)
    .map((task) => task.title)
    .join('\n');

  return {
    date,
    completed: completed.map((task) => ({
      id: task.id,
      title: task.title,
      completedAt: task.completedAt,
    })),
    postponed,
    openTasks: openTasks.map((task) => ({
      id: task.id,
      title: task.title,
      priority: task.priority,
      status: task.status,
      deadline: task.deadline,
      estimatedDuration: task.estimatedDuration,
      postponeCount: task.postponeCount,
    })),
    goals,
    existing: reflections.find((reflection) => reflection.reflectionDate === date) ?? null,
    stats: {
      completedOnDate: completed.length,
      open: openTasks.length,
      overdue: tasks.filter((task) => task.status === 'overdue').length,
      postponeEvents: postponed.length,
    },
    suggestedTomorrowGoals: suggested,
  };
}

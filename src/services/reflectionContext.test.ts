import { describe, expect, it } from 'vitest';
import { buildReflectionContext } from './reflectionContext';
import { toTaskView } from './metrics';
import type { RawTask } from './types';

const NOW = new Date('2026-01-10T12:00:00Z');

function rawTask(overrides: Partial<RawTask> = {}): RawTask {
  return {
    id: 'task-1',
    goalId: null,
    title: 'Example task',
    description: '',
    category: 'General',
    priority: 'medium',
    status: 'not_started',
    deadline: null,
    estimatedDuration: 60,
    actualDuration: null,
    completedAt: null,
    createdAt: '2026-01-01T09:00:00Z',
    updatedAt: '2026-01-01T09:00:00Z',
    records: [],
    ...overrides,
  };
}

describe('buildReflectionContext', () => {
  it('collects the day’s completions, postponements and open work', () => {
    const tasks = [
      toTaskView(
        rawTask({ id: 'done', completedAt: '2026-01-10T10:00:00Z', status: 'completed' }),
        new Map(),
        NOW,
      ),
      toTaskView(
        rawTask({
          id: 'moved',
          deadline: '2026-01-11T09:00:00Z',
          status: 'postponed',
          records: [
            {
              id: 'p1',
              previousDeadline: '2026-01-09T09:00:00Z',
              newDeadline: '2026-01-11T09:00:00Z',
              reason: 'Low energy',
              createdAt: '2026-01-10T09:30:00Z',
            },
          ],
        }),
        new Map(),
        NOW,
      ),
    ];

    const context = buildReflectionContext({
      date: '2026-01-10',
      tasks,
      goals: [],
      reflections: [],
      now: NOW,
    });

    expect(context.completed.map((item) => item.id)).toEqual(['done']);
    expect(context.postponed).toHaveLength(1);
    expect(context.postponed[0].reason).toBe('Low energy');
    expect(context.stats.completedOnDate).toBe(1);
    expect(context.stats.postponeEvents).toBe(1);
    expect(context.stats.open).toBe(1);
    expect(context.suggestedTomorrowGoals).toContain('Example task');
  });

  it('links an existing reflection for the same day', () => {
    const context = buildReflectionContext({
      date: '2026-01-10',
      tasks: [],
      goals: [],
      reflections: [
        {
          id: 'r1',
          reflectionDate: '2026-01-10',
          completedTasks: 'Report',
          unfinishedTasks: '',
          postponementReasons: '',
          learnings: '',
          tomorrowGoals: 'Ship it',
          aiSummary: null,
          summarySource: null,
          createdAt: '2026-01-10T18:00:00Z',
          updatedAt: '2026-01-10T18:00:00Z',
        },
      ],
      now: NOW,
    });

    expect(context.existing?.id).toBe('r1');
  });
});

import { describe, expect, it } from 'vitest';
import { summarize, toTaskView } from './metrics';
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

describe('toTaskView', () => {
  it('sums postponement extensions and marks the task overdue', () => {
    const task = toTaskView(
      rawTask({
        deadline: '2026-01-03T09:00:00Z',
        estimatedDuration: 90,
        status: 'postponed',
        records: [
          {
            id: 'p1',
            previousDeadline: '2026-01-01T09:00:00Z',
            newDeadline: '2026-01-02T09:00:00Z',
            reason: 'Waiting on feedback',
            createdAt: '2026-01-01T10:00:00Z',
          },
          {
            id: 'p2',
            previousDeadline: '2026-01-02T09:00:00Z',
            newDeadline: '2026-01-03T09:00:00Z',
            reason: 'Still blocked',
            createdAt: '2026-01-02T10:00:00Z',
          },
        ],
      }),
      new Map(),
      NOW,
    );

    expect(task.postponeCount).toBe(2);
    expect(task.extensionMinutes).toBe(2880);
    expect(task.originalDeadline).toBe('2026-01-01T09:00:00Z');
    expect(task.status).toBe('overdue');
    expect(task.currentOverdueMinutes).toBe(10260);
    expect(task.delayMinutes).toBe(13140);
    // Estimated lost work is capped at the task's own estimate.
    expect(task.estimatedLostMinutes).toBe(90);
    expect(task.isDelayed).toBe(true);
  });

  it('measures lateness for a completed task without double counting', () => {
    const task = toTaskView(
      rawTask({
        deadline: '2026-01-05T09:00:00Z',
        completedAt: '2026-01-05T12:00:00Z',
        status: 'completed',
      }),
      new Map(),
      NOW,
    );

    expect(task.status).toBe('completed');
    expect(task.latenessMinutes).toBe(180);
    expect(task.currentOverdueMinutes).toBe(0);
    expect(task.delayMinutes).toBe(180);
  });

  it('does not treat an upcoming task as procrastination', () => {
    const task = toTaskView(
      rawTask({ deadline: '2026-01-12T09:00:00Z' }),
      new Map(),
      NOW,
    );

    expect(task.status).toBe('not_started');
    expect(task.delayMinutes).toBe(0);
    expect(task.isDelayed).toBe(false);
  });
});

describe('summarize', () => {
  it('derives completion and overdue counts from task views', () => {
    const tasks = [
      toTaskView(rawTask({ id: 'a', completedAt: '2026-01-09T10:00:00Z', status: 'completed' }), new Map(), NOW),
      toTaskView(rawTask({ id: 'b', deadline: '2026-01-08T09:00:00Z' }), new Map(), NOW),
      toTaskView(rawTask({ id: 'c', deadline: '2026-01-20T09:00:00Z' }), new Map(), NOW),
    ];

    const summary = summarize(tasks, NOW);
    expect(summary.totalTasks).toBe(3);
    expect(summary.completed).toBe(1);
    expect(summary.overdue).toBe(1);
    expect(summary.pending).toBe(2);
    expect(summary.completionRate).toBe(33);
  });
});

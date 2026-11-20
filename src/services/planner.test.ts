import { describe, expect, it } from 'vitest';
import { generateSimulatedPlan } from './planner';
import { toTaskView } from './metrics';
import type { Preferences } from '@/lib/types';
import type { RawTask } from './types';

const NOW = new Date('2026-01-10T08:00:00Z');

const preferences: Preferences = {
  focusStart: '09:00',
  focusEnd: '18:00',
  dailyTarget: 3,
  defaultPlanMinutes: 240,
  notifications: { email: false, weekly: false },
};

function task(id: string, title: string, estimate: number, priority: RawTask['priority']): RawTask {
  return {
    id,
    goalId: null,
    title,
    description: '',
    category: 'Work',
    priority,
    status: 'not_started',
    deadline: '2026-01-11T17:00:00Z',
    estimatedDuration: estimate,
    actualDuration: null,
    completedAt: null,
    createdAt: '2026-01-08T09:00:00Z',
    updatedAt: '2026-01-08T09:00:00Z',
    records: [],
  };
}

describe('generateSimulatedPlan', () => {
  it('builds ordered blocks that fit the available time', () => {
    const tasks = [
      toTaskView(task('1', 'Write report', 60, 'critical'), new Map(), NOW),
      toTaskView(task('2', 'Review PRs', 45, 'high'), new Map(), NOW),
      toTaskView(task('3', 'Tidy inbox', 30, 'low'), new Map(), NOW),
    ];

    const plan = generateSimulatedPlan({
      date: '2026-01-10',
      availableMinutes: 180,
      tasks,
      preferences,
    });

    expect(plan.items.length).toBeGreaterThan(0);
    const focus = plan.items.filter((item) => item.kind === 'focus');
    expect(focus.length).toBeGreaterThanOrEqual(2);
    expect(focus.reduce((total, item) => total + item.durationMinutes, 0)).toBeLessThanOrEqual(
      180,
    );
    expect(plan.items.some((item) => item.kind === 'break')).toBe(true);
    expect(plan.items[0].startTime).toBe('09:00');
    for (const item of plan.items) {
      expect(item.durationMinutes).toBeGreaterThan(0);
      expect(item.startTime < item.endTime).toBe(true);
    }
  });

  it('respects the focus window end even with lots of work', () => {
    const tasks = Array.from({ length: 6 }, (_, index) =>
      toTaskView(task(String(index), `Deep task ${index}`, 75, 'high'), new Map(), NOW),
    );

    const plan = generateSimulatedPlan({
      date: '2026-01-10',
      availableMinutes: 720,
      tasks,
      preferences: { ...preferences, focusEnd: '11:00' },
    });

    expect(plan.items.every((item) => item.endTime <= '11:00')).toBe(true);
  });
});

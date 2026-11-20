import type { PlanContent, PlanItem, Preferences, Priority, Task } from '@/lib/types';
import { formatMinutes, pluralize } from '@/lib/utils';
import { clockToMinutes, formatLongDayKey, minutesToClock } from './dates';
import { sortTasksForFocus } from './metrics';

const SIMULATED_PLAN_NOTICE =
  'Simulated AI demo: this plan was generated locally in your browser from your tasks and available time. No external AI service is connected.';

interface PlannerInput {
  date: string;
  availableMinutes: number;
  focusText?: string;
  tasks: Task[];
  preferences: Preferences;
}

function clampDuration(value: number): number {
  return Math.min(75, Math.max(25, Math.round(value / 5) * 5));
}

function dueLabel(task: Task): string {
  if (!task.deadline) return 'No deadline';
  const date = new Date(task.deadline);
  const today = new Date();
  const days = Math.round(
    (new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime() -
      new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime()) /
      86_400_000,
  );
  if (days < 0) return `${Math.abs(days)} ${pluralize(Math.abs(days), 'day')} overdue`;
  if (days === 0) return 'Due today';
  if (days === 1) return 'Due tomorrow';
  return `Due in ${days} days`;
}

const priorityLabel: Record<Priority, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  critical: 'Critical',
};

export function generateSimulatedPlan(input: PlannerInput): PlanContent {
  const { availableMinutes, preferences, focusText = '' } = input;
  const startClock = /^\d{2}:\d{2}$/.test(preferences.focusStart)
    ? preferences.focusStart
    : '09:00';
  const endClock = /^\d{2}:\d{2}$/.test(preferences.focusEnd) ? preferences.focusEnd : '18:00';

  let cursor = clockToMinutes(startClock);
  const dayEnd = Math.max(clockToMinutes(endClock), cursor + 30);
  const capacity = Math.min(availableMinutes, dayEnd - cursor);

  const keywords = focusText
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((word) => word.length > 3);

  const candidates = sortTasksForFocus(input.tasks).sort((a, b) => {
    const match = (task: Task) => {
      if (keywords.length === 0) return 0;
      const haystack = `${task.title} ${task.description} ${task.category}`.toLowerCase();
      return keywords.some((word) => haystack.includes(word)) ? 1 : 0;
    };
    return match(b) - match(a);
  });

  const items: PlanItem[] = [];
  let remaining = capacity;
  let focusBlocks = 0;
  let elapsedSinceBreak = 0;

  const pushItem = (item: Omit<PlanItem, 'id'>) => {
    items.push({ ...item, id: cryptoId() });
  };

  for (const task of candidates) {
    if (focusBlocks >= 5 || remaining < 25) break;
    const duration = Math.min(
      clampDuration(task.estimatedDuration ?? 50),
      remaining,
      dayEnd - cursor,
    );
    if (duration < 20) break;

    const start = minutesToClock(cursor);
    const end = minutesToClock(cursor + duration);

    pushItem({
      title: task.title,
      startTime: start,
      endTime: end,
      durationMinutes: duration,
      priority: task.priority,
      kind: 'focus',
      taskId: task.id,
      why: `${dueLabel(task)} · ${priorityLabel[task.priority]} priority${
        task.postponeCount > 0 ? ` · postponed ${task.postponeCount}×` : ''
      }`,
      steps: [
        'Open the task and remove one source of friction.',
        task.estimatedDuration && task.estimatedDuration > 60
          ? 'Work in two passes: outline first, then fill in the detail.'
          : `Work for ${duration} focused minutes without switching tabs.`,
        'Write down the next concrete step before stopping.',
      ],
      done: false,
    });

    cursor += duration;
    remaining -= duration;
    elapsedSinceBreak += duration;
    focusBlocks += 1;

    if (
      elapsedSinceBreak >= 55 &&
      remaining >= 25 &&
      dayEnd - cursor >= 20 &&
      focusBlocks < 5 &&
      candidates.length > focusBlocks
    ) {
      const breakDuration = Math.min(10, remaining - 10, dayEnd - cursor);
      if (breakDuration >= 5) {
        pushItem({
          title: 'Reset break',
          startTime: minutesToClock(cursor),
          endTime: minutesToClock(cursor + breakDuration),
          durationMinutes: breakDuration,
          priority: 'low',
          kind: 'break',
          taskId: null,
          why: 'A real break protects the next block from drift.',
          steps: ['Stand up, drink water, and look away from the screen.'],
          done: false,
        });
        cursor += breakDuration;
        remaining -= breakDuration;
        elapsedSinceBreak = 0;
      }
    }
  }

  if (items.length === 0) {
    const duration = Math.min(30, capacity);
    pushItem({
      title: 'Clarify the next real action',
      startTime: minutesToClock(cursor),
      endTime: minutesToClock(cursor + duration),
      durationMinutes: duration,
      priority: 'high',
      kind: 'focus',
      taskId: null,
      why: 'No open tasks were available to schedule.',
      steps: [
        'Write down one task that would make today count.',
        'Give it a deadline and an honest estimate.',
        'Add it to STOPIFY and generate the plan again.',
      ],
      done: false,
    });
    cursor += duration;
    remaining -= duration;
  } else if (remaining >= 25 && focusBlocks >= 2 && dayEnd - cursor >= 20) {
    const bufferDuration = Math.min(30, remaining, dayEnd - cursor);
    pushItem({
      title: 'Buffer',
      startTime: minutesToClock(cursor),
      endTime: minutesToClock(cursor + bufferDuration),
      durationMinutes: bufferDuration,
      priority: 'low',
      kind: 'buffer',
      taskId: null,
      why: 'Unplanned work happens. A buffer keeps the plan from collapsing.',
      steps: ['Handle one loose end or rest before the next commitment.'],
      done: false,
    });
  }

  const focusMinutes = items
    .filter((item) => item.kind === 'focus')
    .reduce((total, item) => total + item.durationMinutes, 0);

  const topTask = candidates[0];
  const summaryParts = [
    `A ${focusBlocks} ${pluralize(focusBlocks, 'focus block')} plan for ${formatLongDayKey(
      input.date,
    )}, using ${formatMinutes(focusMinutes)} of your ${formatMinutes(availableMinutes)} capacity.`,
  ];
  if (topTask) {
    summaryParts.push(
      `The first block is “${topTask.title}” — ${dueLabel(topTask).toLowerCase()}.`,
    );
  }
  if (keywords.length > 0) {
    summaryParts.push(`Blocks were matched against your focus note: “${focusText.trim()}”.`);
  }
  summaryParts.push('Time is anchored to your preferred focus window.');

  return {
    summary: summaryParts.join(' '),
    items,
    notes: '',
  };
}

export { SIMULATED_PLAN_NOTICE };

let fallbackId = 0;
function cryptoId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  fallbackId += 1;
  return `item-${Date.now()}-${fallbackId}`;
}

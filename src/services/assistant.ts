import type { Goal, Preferences, Reflection, Summary, Task } from '@/lib/types';
import { formatMinutes, pluralize, truncate } from '@/lib/utils';
import { deadlineInfo, formatDateKey } from '@/lib/utils';

export const SIMULATED_ASSISTANT_NOTICE =
  'Simulated assistant: replies are generated locally from your tasks and records. No external AI service is connected in this frontend demo.';

interface AssistantInput {
  userName: string;
  message: string;
  tasks: Task[];
  goals: Goal[];
  summary: Summary;
  reflections: Reflection[];
  preferences: Preferences;
}

function nextTasks(tasks: Task[], limit = 3): Task[] {
  return tasks
    .filter((task) => !task.completedAt)
    .sort((a, b) => {
      const priority: Record<string, number> = { critical: 4, high: 3, medium: 2, low: 1 };
      const overdueA = a.status === 'overdue' ? 100 : 0;
      const overdueB = b.status === 'overdue' ? 100 : 0;
      const deadlineA = a.deadline ? new Date(a.deadline).getTime() : Number.MAX_SAFE_INTEGER;
      const deadlineB = b.deadline ? new Date(b.deadline).getTime() : Number.MAX_SAFE_INTEGER;
      return (
        overdueB +
        priority[b.priority] +
        (deadlineB === Number.MAX_SAFE_INTEGER ? 0 : -deadlineB / 1e12) -
        (overdueA +
          priority[a.priority] +
          (deadlineA === Number.MAX_SAFE_INTEGER ? 0 : -deadlineA / 1e12))
      );
    })
    .slice(0, limit);
}

function taskLine(task: Task): string {
  return `• “${task.title}” — ${deadlineInfo(task.deadline).label}${
    task.postponeCount > 0 ? `, postponed ${task.postponeCount}×` : ''
  }`;
}

function topReason(tasks: Task[]): string | null {
  const counts = new Map<string, number>();
  for (const task of tasks) {
    for (const record of task.records) {
      const reason = record.reason.trim();
      if (!reason) continue;
      counts.set(reason, (counts.get(reason) ?? 0) + 1);
    }
  }
  const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  return sorted[0]?.[0] ?? null;
}

export function generateAssistantReply(input: AssistantInput): string {
  const message = input.message.toLowerCase().trim();
  const open = input.tasks.filter((task) => !task.completedAt);
  const overdue = input.tasks.filter((task) => task.status === 'overdue');
  const focus = nextTasks(input.tasks);
  const riskyGoals = input.goals.filter((goal) => goal.status === 'active' && goal.atRisk);
  const name = input.userName.split(' ')[0] || 'there';

  const intro = `Here’s what your data suggests, ${name}:`;

  if (/^(hi|hello|hey|yo)\b/.test(message)) {
    return [
      `Hello, ${name}. I can work from the ${input.tasks.length} tasks and ${input.summary.postponeEvents} postponement records in this workspace.`,
      focus.length > 0
        ? `The most urgent open item right now is “${focus[0].title}” — ${deadlineInfo(focus[0].deadline).label}.`
        : 'There are no open tasks. Add one and I can help you sequence it.',
      'Ask me what to start, why something keeps slipping, or what your delay is costing.',
    ].join('\n\n');
  }

  if (/(analyz|analys|productiv|performance|weekly report|progress report)/.test(message)) {
    const delta = input.summary.completedLast7 - input.summary.completedPrev7;
    return [
      intro,
      `Last 7 days: ${input.summary.completedLast7} ${pluralize(
        input.summary.completedLast7,
        'task',
      )} completed, ${input.summary.dueLast7} due and ${input.summary.postponedLast7} postponement ${
        input.summary.postponedLast7 === 1 ? 'event' : 'events'
      }.`,
      delta === 0
        ? `That is the same completion count as the previous week. On-time rate is ${
            input.summary.onTimeRate ?? 0
          }%.`
        : delta > 0
          ? `That is ${delta} more than the previous week. On-time rate is ${
              input.summary.onTimeRate ?? 0
            }%.`
          : `That is ${Math.abs(delta)} fewer than the previous week. On-time rate is ${
              input.summary.onTimeRate ?? 0
            }%.`,
      `Estimated lost work across the workspace is ${formatMinutes(
        input.summary.estimatedLostMinutes,
      )}. ${
        focus[0]
          ? `The next leverage point is “${focus[0].title}” — ${deadlineInfo(focus[0].deadline).label.toLowerCase()}.`
          : 'No open tasks are waiting right now.'
      }`,
      'Open Analytics for the daily, weekly and monthly breakdown behind these numbers.',
    ].join('\n\n');
  }

  if (/(break|smaller|chunk|split|overwhelm|too big|first step)/.test(message)) {
    const target = focus[0];
    if (!target) {
      return [
        intro,
        'There is no open task to split yet. Add the task first, then ask me to break it into smaller steps.',
        'A useful split names the first physical action — open the file, draft the heading, gather the sources — not a mood.',
      ].join('\n\n');
    }
    const estimate = target.estimatedDuration ?? 60;
    const chunk = Math.max(10, Math.min(30, Math.round(estimate / 3 / 5) * 5));
    return [
      intro,
      `Take “${target.title}” first — ${deadlineInfo(target.deadline).label.toLowerCase()}.`,
      `Split the estimated ${estimate} minutes into starting-size blocks:`,
      `1. Define “done” for the first session in one sentence.\n2. Gather only the inputs that session needs (file, notes, link).\n3. Work ${chunk} minutes on the smallest visible output.\n4. Stop, write down the next physical action, and schedule the next ${chunk}-minute block.`,
      target.postponeCount > 0
        ? `It has already moved ${target.postponeCount}×, so make the first block smaller than feels necessary.`
        : 'Keep the first block small enough that starting is the only decision left.',
    ].join('\n\n');
  }

  if (/(plan|schedule|calendar|organi[sz]e|tomorrow)/.test(message)) {
    const available = input.preferences.defaultPlanMinutes;
    return [
      intro,
      `Your default planning capacity is ${formatMinutes(available)}, and your focus window is ${input.preferences.focusStart}–${input.preferences.focusEnd}.`,
      focus.length > 0
        ? `I would anchor the first block to “${focus[0].title}”. Then cover:\n${focus
            .slice(1)
            .map(taskLine)
            .join('\n')}`
        : 'There is nothing open to schedule yet.',
      'Open the AI Planner to generate a block-by-block plan for today. This demo planner builds the plan locally and labels it as simulated.',
    ].join('\n\n');
  }

  if (/(overdue|late|missed|behind)/.test(message)) {
    if (overdue.length === 0) {
      return [
        intro,
        'Nothing is currently past its deadline.',
        input.summary.completedLast7 > 0
          ? `${input.summary.completedLast7} ${pluralize(input.summary.completedLast7, 'task')} were completed in the last seven days. Your on-time rate is ${
              input.summary.onTimeRate ?? 0
            }%.`
          : 'No completions in the last seven days yet. Pick the nearest deadline and make it real.',
      ].join('\n\n');
    }
    return [
      intro,
      `You have ${overdue.length} overdue ${pluralize(overdue.length, 'task')}. The largest exposure is “${overdue[0].title}” (${deadlineInfo(overdue[0].deadline).label}).`,
      overdue.slice(0, 3).map(taskLine).join('\n'),
      `Overdue time currently totals ${formatMinutes(
        input.summary.totalDelayMinutes,
      )} of recorded delay. Choose the smallest one and finish it first to stop the bleed.`,
    ].join('\n\n');
  }

  if (/(why|procrastinat|avoid|stuck|keep postponing|slipping)/.test(message)) {
    const most = [...input.tasks]
      .filter((task) => !task.completedAt && task.records.length > 0)
      .sort((a, b) => b.postponeCount - a.postponeCount)[0];
    const reason = topReason(input.tasks);

    if (!most) {
      return [
        intro,
        'No repeat postponement pattern is visible yet. When you postpone, record the real reason — that is what makes the pattern usable.',
        'If something feels stuck, shrink it: define a 10-minute first step and put it on the calendar.',
      ].join('\n\n');
    }

    return [
      intro,
      `“${most.title}” has moved ${most.postponeCount} ${pluralize(
        most.postponeCount,
        'time',
      )} and now carries ${formatMinutes(most.delayMinutes)} of recorded delay. This is not a character flaw; it is a task design problem.`,
      reason
        ? `Your most frequent stated reason across the workspace is: “${truncate(reason, 120)}”.`
        : 'You have not recorded a reason consistently, so the pattern is harder to read.',
      `Next step: make the next work session 15 minutes, define exactly what “done” looks like for that session, and use the task’s steps. If the reason is genuinely external, change the commitment instead of silently moving it.`,
    ].join('\n\n');
  }

  if (/(goal|project|objective|dissertation|thesis|portfolio)/.test(message)) {
    if (input.goals.length === 0) {
      return [
        intro,
        'No goals are defined yet, so tasks are floating without a direction. Create one goal with a target date, then attach the work that serves it.',
      ].join('\n\n');
    }
    const goalLines = input.goals
      .filter((goal) => goal.status === 'active')
      .slice(0, 4)
      .map(
        (goal) =>
          `• ${goal.title} — ${goal.progress}% complete, ${goal.delayedCount} delayed ${
            goal.delayedCount === 1 ? 'task' : 'tasks'
          }${goal.atRisk ? ' · at risk' : ''}`,
      );
    return [
      intro,
      ...goalLines,
      riskyGoals.length > 0
        ? `${riskyGoals[0].title} is the goal most exposed to accumulated delay. Protect one task under it today.`
        : 'No active goal is currently flagged at risk. Keep deadlines attached to the next task under each goal.',
    ].join('\n\n');
  }

  if (/(time lost|cost|costing|consequence|delay|impact|lost)/.test(message)) {
    return [
      intro,
      `${input.summary.postponeEvents} postponements have produced ${formatMinutes(
        input.summary.totalDelayMinutes,
      )} of recorded delay. Using the smaller of each task estimate and its delay, estimated lost work is ${formatMinutes(
        input.summary.estimatedLostMinutes,
      )}.`,
      input.summary.delayedTasks > 0
        ? `${input.summary.delayedTasks} ${pluralize(input.summary.delayedTasks, 'task')} carry delay. The Procrastination page shows the ledger, category breakdown and a local projection.`
        : 'No delay is recorded yet — a good time to protect the habit.',
      'This is a deliberate estimate computed from your own records, not a clinical measurement.',
    ].join('\n\n');
  }

  if (/(reflect|journal|check.?in|review)/.test(message)) {
    const latest = input.reflections[0];
    return [
      intro,
      latest
        ? `Your latest reflection is for ${formatDateKey(latest.reflectionDate)}. Its summary notes: “${truncate(
            latest.aiSummary ?? 'No generated summary yet.',
            180,
          )}”`
        : 'No reflections are saved yet. A three-line check-in is enough: what moved, what stalled, what you will do differently.',
      'Open Daily Reflection to log today and generate a local summary from your own words.',
    ].join('\n\n');
  }

  if (/(next|start|focus|what should i|begin|now)/.test(message)) {
    if (focus.length === 0) {
      return [
        intro,
        'No open tasks remain. Either you are done for now, or the next commitment has not been written down yet.',
        'Add one task with a deadline, then ask again.',
      ].join('\n\n');
    }
    const first = focus[0];
    return [
      intro,
      `Start with “${first.title}”. It is ${deadlineInfo(first.deadline).label.toLowerCase()}${
        first.postponeCount > 0 ? ` and has been postponed ${first.postponeCount}×` : ''
      }.`,
      `Set a ${Math.min(30, first.estimatedDuration ?? 30)}-minute timer. Do only the first visible step: open the file, gather the material, write the heading. Momentum is cheaper than motivation.`,
      focus.length > 1
        ? `After that, the next candidates are:\n${focus
            .slice(1)
            .map(taskLine)
            .join('\n')}`
        : '',
    ]
      .filter(Boolean)
      .join('\n\n');
  }

  return [
    intro,
    `You have ${open.length} open ${pluralize(open.length, 'task')}${
      overdue.length > 0 ? `, ${overdue.length} overdue` : ''
    }. Current streak: ${input.summary.currentStreak} ${pluralize(
      input.summary.currentStreak,
      'day',
    )}.`,
    focus[0] ? `The best next action is “${focus[0].title}” — ${deadlineInfo(focus[0].deadline).label}.` : '',
    'Try asking: “What should I do next?”, “Why do I keep postponing literature review?”, or “What is my delay costing me?”',
  ]
    .filter(Boolean)
    .join('\n\n');
}

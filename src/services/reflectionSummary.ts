import type { Reflection, Summary, Task } from '@/lib/types';
import { formatMinutes, pluralize, truncate } from '@/lib/utils';
import { formatLongDayKey } from './dates';

export const SIMULATED_SUMMARY_NOTICE =
  'This reflection summary was generated locally from your own words and task data. It is a simulated AI feature for this frontend demo.';

interface ReflectionSummaryInput {
  userName: string;
  date: string;
  completedTasks: string;
  unfinishedTasks: string;
  postponementReasons: string;
  learnings: string;
  tomorrowGoals: string;
  tasks: Task[];
  summary: Summary;
}

function lines(text: string): string[] {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
}

function sentenceList(values: string[], max = 2): string {
  return values.slice(0, max).join('; ');
}

export function generateReflectionSummary(input: ReflectionSummaryInput): string {
  const completed = lines(input.completedTasks);
  const unfinished = lines(input.unfinishedTasks);
  const reasons = lines(input.postponementReasons);
  const learnings = input.learnings.trim();
  const tomorrow = lines(input.tomorrowGoals);
  const paragraphs: string[] = [];

  const openCount = input.tasks.filter((task) => !task.completedAt).length;
  const loggedCompleted = completed.length;

  paragraphs.push(
    `On ${formatLongDayKey(input.date)}, you logged ${loggedCompleted} completed ${
      loggedCompleted === 1 ? 'item' : 'items'
    }${unfinished.length > 0 ? ` and ${unfinished.length} unfinished` : ''}. ${
      completed.length > 0
        ? `You named “${truncate(completed[0], 90)}” as done.`
        : 'No completed work was written down for this day.'
    }`,
  );

  if (reasons.length > 0) {
    paragraphs.push(
      `The delay reasons you recorded were: ${sentenceList(reasons)}. ${
        input.summary.postponeEvents > 0
          ? `Across your whole workspace, ${input.summary.postponeEvents} postponements have added ${formatMinutes(
              input.summary.totalDelayMinutes,
            )} of recorded delay and an estimated ${formatMinutes(
              input.summary.estimatedLostMinutes,
            )} of lost work.`
          : 'The task ledger has no postponements recorded yet.'
      }`,
    );
  } else if (input.summary.postponeEvents > 0) {
    paragraphs.push(
      `You did not log a postponement reason for this day, but your ledger still holds ${
        input.summary.postponeEvents
      } ${pluralize(input.summary.postponeEvents, 'postponement')} and ${formatMinutes(
        input.summary.estimatedLostMinutes,
      )} of estimated lost work.`,
    );
  }

  if (learnings) {
    paragraphs.push(`Your main takeaway: “${truncate(learnings, 240)}”.`);
  }

  if (tomorrow.length > 0) {
    paragraphs.push(
      `For tomorrow, you chose: ${sentenceList(tomorrow, 3)}. ${
        input.summary.overdueNow > 0
          ? `Start with the ${input.summary.overdueNow} overdue ${
              input.summary.overdueNow === 1 ? 'task' : 'tasks'
            } before adding anything new.`
          : openCount > 0
            ? `You still have ${openCount} open ${pluralize(openCount, 'task')}; pick the one with the nearest deadline.`
            : 'The board is clear of open work.'
      }`,
    );
  } else if (openCount > 0) {
    paragraphs.push(
      `There are ${openCount} open ${pluralize(openCount, 'task')}. A useful next step is to choose one, set a 25-minute timer and begin without redesigning the whole day.`,
    );
  }

  return paragraphs.join('\n\n');
}

export function reflectionSummaryFor(reflection: Reflection, tasks: Task[], summary: Summary): string {
  return generateReflectionSummary({
    userName: 'you',
    date: reflection.reflectionDate,
    completedTasks: reflection.completedTasks,
    unfinishedTasks: reflection.unfinishedTasks,
    postponementReasons: reflection.postponementReasons,
    learnings: reflection.learnings,
    tomorrowGoals: reflection.tomorrowGoals,
    tasks,
    summary,
  });
}

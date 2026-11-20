import type { Plan, Profile, Reflection, User } from '@/lib/types';
import { addDays, dayKey, startOfDay } from './dates';
import { buildTaskViews, summarize } from './metrics';
import { generateSimulatedPlan, SIMULATED_PLAN_NOTICE } from './planner';
import { generateReflectionSummary } from './reflectionSummary';
import type { RawGoal, RawPostponement, RawTask, WorkspaceData } from './types';
import { profileFromUser } from './workspaceStore';

const defaultPlanMinutes = 240;

let fallbackCounter = 0;
function id(prefix: string): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  fallbackCounter += 1;
  return `${prefix}-${Date.now()}-${fallbackCounter}`;
}

export function createSampleWorkspace(user: User): WorkspaceData {
  const now = new Date();
  const profile: Profile = profileFromUser(user);

  const at = (dayOffset: number, hours: number, minutes = 0): string => {
    const date = addDays(startOfDay(now), dayOffset);
    date.setHours(hours, minutes, 0, 0);
    return date.toISOString();
  };
  const today = dayKey(now);

  const goalIds = {
    dissertation: id('goal'),
    portfolio: id('goal'),
    finals: id('goal'),
    proposal: id('goal'),
  };

  const goals: RawGoal[] = [
    {
      id: goalIds.dissertation,
      title: 'Finish MSc dissertation',
      description:
        'Produce a complete, defensible dissertation draft and submit it before the final deadline.',
      targetDate: at(42, 17),
      status: 'active',
      createdAt: at(-40, 9),
      updatedAt: at(-2, 9),
    },
    {
      id: goalIds.portfolio,
      title: 'Ship portfolio website',
      description: 'Publish three case studies and a working contact form on my personal site.',
      targetDate: at(18, 20),
      status: 'active',
      createdAt: at(-25, 10),
      updatedAt: at(-1, 18),
    },
    {
      id: goalIds.finals,
      title: 'Prepare for final exams',
      description: 'Cover all modules with active recall and two past papers per subject.',
      targetDate: at(30, 8),
      status: 'active',
      createdAt: at(-21, 8),
      updatedAt: at(0, 8),
    },
    {
      id: goalIds.proposal,
      title: 'Complete research proposal',
      description: 'Write, revise and submit the research proposal with supervisor approval.',
      targetDate: at(-12, 17),
      status: 'completed',
      createdAt: at(-45, 9),
      updatedAt: at(-10, 15),
    },
  ];

  const record = (
    previousDeadline: string,
    newDeadline: string,
    reason: string,
    createdAt: string,
  ): RawPostponement => ({
    id: id('postpone'),
    previousDeadline,
    newDeadline,
    reason,
    createdAt,
  });

  const tasks: RawTask[] = [
    {
      id: id('task'),
      goalId: goalIds.dissertation,
      title: 'Write literature review',
      description:
        'Synthesise the 12 key papers into a coherent literature review. Start with the thematic outline, then write one section per theme.',
      category: 'Writing',
      priority: 'critical',
      status: 'postponed',
      deadline: at(-2, 23, 59),
      estimatedDuration: 240,
      actualDuration: null,
      completedAt: null,
      createdAt: at(-12, 9),
      updatedAt: at(-4, 20),
      records: [
        record(
          at(-8, 23, 59),
          at(-5, 23, 59),
          'Kept waiting for a “proper block of time” instead of starting.',
          at(-8, 19),
        ),
        record(
          at(-5, 23, 59),
          at(-2, 23, 59),
          'Underestimated how long it would take to gather the sources.',
          at(-4, 20),
        ),
      ],
    },
    {
      id: id('task'),
      goalId: goalIds.dissertation,
      title: 'Run statistical analysis',
      description:
        'Run descriptive statistics and the mixed-effects models for the pilot data, then export the tables for the methodology chapter.',
      category: 'Research',
      priority: 'high',
      status: 'completed',
      deadline: at(-1, 12),
      estimatedDuration: 180,
      actualDuration: 210,
      completedAt: at(-1, 18, 20),
      createdAt: at(-6, 10),
      updatedAt: at(-1, 18, 20),
      records: [
        record(
          at(-3, 18),
          at(-1, 12),
          'Needed the cleaned dataset before the analysis could start.',
          at(-3, 9),
        ),
      ],
    },
    {
      id: id('task'),
      goalId: goalIds.dissertation,
      title: 'Draft methodology section',
      description:
        'Turn the analysis notes into a 1,200-word methodology section with limitations and justification for each method.',
      category: 'Writing',
      priority: 'high',
      status: 'not_started',
      deadline: at(1, 18),
      estimatedDuration: 120,
      actualDuration: null,
      completedAt: null,
      createdAt: at(-7, 10),
      updatedAt: at(-1, 9),
      records: [
        record(
          at(-1, 18),
          at(1, 18),
          'Waiting on supervisor feedback before committing to the structure.',
          at(-1, 9),
        ),
      ],
    },
    {
      id: id('task'),
      goalId: goalIds.dissertation,
      title: 'Send supervisor progress email',
      description:
        'Send a short update with completed analysis, the new methodology deadline, and two questions about the literature scope.',
      category: 'Admin',
      priority: 'medium',
      status: 'not_started',
      deadline: at(-1, 12),
      estimatedDuration: 30,
      actualDuration: null,
      completedAt: null,
      createdAt: at(-4, 8),
      updatedAt: at(-4, 8),
      records: [],
    },
    {
      id: id('task'),
      goalId: goalIds.portfolio,
      title: 'Build portfolio case study layout',
      description:
        'Design the first case study page: problem, process, outcome, and a clear technical stack. Keep it readable on mobile.',
      category: 'Coding',
      priority: 'medium',
      status: 'in_progress',
      deadline: at(0, 20),
      estimatedDuration: 90,
      actualDuration: null,
      completedAt: null,
      createdAt: at(-5, 11),
      updatedAt: at(0, 8),
      records: [],
    },
    {
      id: id('task'),
      goalId: goalIds.portfolio,
      title: 'Build contact form',
      description:
        'Add a working contact form with validation and a clear success state. Frontend-only for now.',
      category: 'Coding',
      priority: 'medium',
      status: 'not_started',
      deadline: at(3, 18),
      estimatedDuration: 60,
      actualDuration: null,
      completedAt: null,
      createdAt: at(-6, 15),
      updatedAt: at(-6, 15),
      records: [],
    },
    {
      id: id('task'),
      goalId: goalIds.portfolio,
      title: 'Write About page copy',
      description:
        'Write a short, specific about page: what I build, how I work, and what I am looking for next.',
      category: 'Writing',
      priority: 'low',
      status: 'not_started',
      deadline: at(5, 18),
      estimatedDuration: 45,
      actualDuration: null,
      completedAt: null,
      createdAt: at(-6, 16),
      updatedAt: at(-6, 16),
      records: [],
    },
    {
      id: id('task'),
      goalId: goalIds.finals,
      title: 'Review organic chemistry notes',
      description:
        'Condense the organic chemistry notes into active-recall questions, focusing on reaction mechanisms.',
      category: 'Study',
      priority: 'high',
      status: 'postponed',
      deadline: at(2, 20),
      estimatedDuration: 120,
      actualDuration: null,
      completedAt: null,
      createdAt: at(-3, 9),
      updatedAt: at(-1, 20),
      records: [
        record(
          at(0, 20),
          at(2, 20),
          'Low energy after a full day of labs.',
          at(-1, 20, 10),
        ),
      ],
    },
    {
      id: id('task'),
      goalId: goalIds.finals,
      title: 'Solve past exam paper 2024',
      description:
        'Complete the 2024 past paper under timed conditions, then mark it and list the three weakest topics.',
      category: 'Exam prep',
      priority: 'high',
      status: 'not_started',
      deadline: at(4, 18),
      estimatedDuration: 180,
      actualDuration: null,
      completedAt: null,
      createdAt: at(-2, 8),
      updatedAt: at(-2, 8),
      records: [],
    },
    {
      id: id('task'),
      goalId: goalIds.finals,
      title: 'Make flashcards for reaction mechanisms',
      description:
        'Create 25 active-recall flashcards covering the reaction mechanisms that came up in problem sets.',
      category: 'Study',
      priority: 'medium',
      status: 'not_started',
      deadline: at(6, 18),
      estimatedDuration: 60,
      actualDuration: null,
      completedAt: null,
      createdAt: at(-2, 8),
      updatedAt: at(-2, 8),
      records: [],
    },
    {
      id: id('task'),
      goalId: goalIds.proposal,
      title: 'Submit research proposal',
      description:
        'Final proofread and submission of the approved research proposal, including the ethics appendix.',
      category: 'Research',
      priority: 'high',
      status: 'completed',
      deadline: at(-10, 23, 59),
      estimatedDuration: 300,
      actualDuration: 280,
      completedAt: at(-10, 14),
      createdAt: at(-16, 9),
      updatedAt: at(-10, 14),
      records: [],
    },
    {
      id: id('task'),
      goalId: goalIds.proposal,
      title: 'Collect supervisor feedback',
      description:
        'Book a feedback meeting and capture the required revisions in one document.',
      category: 'Admin',
      priority: 'medium',
      status: 'completed',
      deadline: at(-14, 23, 59),
      estimatedDuration: 45,
      actualDuration: 40,
      completedAt: at(-14, 11),
      createdAt: at(-18, 10),
      updatedAt: at(-14, 11),
      records: [],
    },
    {
      id: id('task'),
      goalId: goalIds.dissertation,
      title: 'Read two papers on procrastination',
      description:
        'Read and annotate two papers on academic procrastination for the introduction.',
      category: 'Reading',
      priority: 'medium',
      status: 'completed',
      deadline: at(-1, 21),
      estimatedDuration: 60,
      actualDuration: 55,
      completedAt: at(-1, 19),
      createdAt: at(-2, 9),
      updatedAt: at(-1, 19),
      records: [],
    },
    {
      id: id('task'),
      goalId: null,
      title: 'Update CV',
      description:
        'Add the research proposal and the new data analysis work to the CV, then export a PDF.',
      category: 'Personal',
      priority: 'low',
      status: 'completed',
      deadline: at(-3, 23, 59),
      estimatedDuration: 30,
      actualDuration: 25,
      completedAt: at(-2, 11),
      createdAt: at(-8, 14),
      updatedAt: at(-2, 11),
      records: [],
    },
    {
      id: id('task'),
      goalId: goalIds.portfolio,
      title: 'Set up portfolio project repository',
      description:
        'Create the repository, configure the build, and deploy the empty shell to a preview URL.',
      category: 'Coding',
      priority: 'low',
      status: 'completed',
      deadline: at(-3, 23, 59),
      estimatedDuration: 45,
      actualDuration: 40,
      completedAt: at(-3, 10),
      createdAt: at(-10, 9),
      updatedAt: at(-3, 10),
      records: [],
    },
    {
      id: id('task'),
      goalId: null,
      title: 'Submit weekly reflection',
      description:
        'Close the week honestly: what moved, what stalled, and one change for next week.',
      category: 'Personal',
      priority: 'low',
      status: 'completed',
      deadline: at(-4, 23, 59),
      estimatedDuration: 20,
      actualDuration: 15,
      completedAt: at(-4, 21),
      createdAt: at(-11, 20),
      updatedAt: at(-4, 21),
      records: [],
    },
    {
      id: id('task'),
      goalId: goalIds.finals,
      title: 'Review lecture recording',
      description:
        'Watch the second half of the thermodynamics lecture and add the missing worked examples to my notes.',
      category: 'Study',
      priority: 'medium',
      status: 'completed',
      deadline: at(0, 12),
      estimatedDuration: 45,
      actualDuration: 40,
      completedAt: new Date(now.getTime() - 45 * 60_000).toISOString(),
      createdAt: at(-1, 9),
      updatedAt: new Date(now.getTime() - 45 * 60_000).toISOString(),
      records: [],
    },
    {
      id: id('task'),
      goalId: goalIds.finals,
      title: 'Complete chemistry problem set',
      description: 'Finish problem set 5 and check the answers against the marking scheme.',
      category: 'Assignment',
      priority: 'high',
      status: 'completed',
      deadline: at(-5, 23, 59),
      estimatedDuration: 90,
      actualDuration: 95,
      completedAt: at(-5, 17),
      createdAt: at(-9, 10),
      updatedAt: at(-5, 17),
      records: [],
    },
  ];

  const taskViews = buildTaskViews(tasks, goals, now);
  const summary = summarize(taskViews, now);

  const todayKeyValue = today;
  const todayPlanContent = generateSimulatedPlan({
    date: todayKeyValue,
    availableMinutes: defaultPlanMinutes,
    focusText: 'dissertation literature review',
    tasks: taskViews,
    preferences: profile.preferences,
  });

  const yesterdayKey = dayKey(addDays(now, -1));
  const yesterdayPlanContent = generateSimulatedPlan({
    date: yesterdayKey,
    availableMinutes: 180,
    focusText: 'statistics',
    tasks: taskViews,
    preferences: profile.preferences,
  });
  const yesterdayPlan: Plan = {
    id: id('plan'),
    planDate: yesterdayKey,
    availableMinutes: 180,
    source: 'simulated',
    plan: {
      ...yesterdayPlanContent,
      items: yesterdayPlanContent.items.map((item, index) => ({
        ...item,
        done: index < 2,
      })),
    },
    notice: SIMULATED_PLAN_NOTICE,
    createdAt: at(-1, 7, 30),
    itemCount: yesterdayPlanContent.items.length,
    doneCount: Math.min(2, yesterdayPlanContent.items.length),
  };

  const todayPlan: Plan = {
    id: id('plan'),
    planDate: todayKeyValue,
    availableMinutes: profile.preferences.defaultPlanMinutes,
    source: 'simulated',
    plan: todayPlanContent,
    notice: SIMULATED_PLAN_NOTICE,
    createdAt: new Date(now.getTime() - 2 * 60 * 60_000).toISOString(),
    itemCount: todayPlanContent.items.length,
    doneCount: 0,
  };

  const makeReflection = (
    dateOffset: number,
    fields: {
      completedTasks: string;
      unfinishedTasks: string;
      postponementReasons: string;
      learnings: string;
      tomorrowGoals: string;
    },
    createdHour: number,
  ): Reflection => {
    const date = dayKey(addDays(now, dateOffset));
    const createdAt = at(dateOffset, createdHour, 20);
    return {
      id: id('reflection'),
      reflectionDate: date,
      ...fields,
      aiSummary: generateReflectionSummary({
        userName: profile.name,
        date,
        ...fields,
        tasks: taskViews,
        summary,
      }),
      summarySource: 'simulated',
      createdAt,
      updatedAt: createdAt,
    };
  };

  const reflections: Reflection[] = [
    makeReflection(
      -1,
      {
        completedTasks:
          'Ran the statistical analysis for the pilot dataset.\nRead two papers on the psychology of procrastination.',
        unfinishedTasks: 'Literature review synthesis is still untouched.',
        postponementReasons:
          'Underestimated how long it would take to gather sources.\nKept waiting for a “proper block of time”.',
        learnings: 'Two 45-minute blocks beat one imaginary four-hour block.',
        tomorrowGoals:
          'Start the literature review synthesis.\nSend the progress email to my supervisor.',
      },
      21,
    ),
    makeReflection(
      -2,
      {
        completedTasks: 'Set up the portfolio project repository.\nUpdated my CV.',
        unfinishedTasks: 'Organic chemistry notes still need a first pass.',
        postponementReasons: 'Low energy after a full day of labs.',
        learnings: 'Morning focus is more reliable than evening good intentions.',
        tomorrowGoals: 'Review the lecture recording.\nDraft the portfolio case study.',
      },
      20,
    ),
  ];

  const timestamp = now.toISOString();
  return {
    version: 1,
    tasks,
    goals,
    plans: [todayPlan, yesterdayPlan],
    reflections,
    achievements: [],
    conversations: [],
    profile,
    preferences: profile.preferences,
    isSampleData: true,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

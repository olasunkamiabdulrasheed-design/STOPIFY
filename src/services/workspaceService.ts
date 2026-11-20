import type { Plan, PlanItem, Preferences, Reflection, ReflectionContext, User } from '@/lib/types';
import { generateAssistantReply } from './assistant';
import { clockToMinutes, minutesToClock } from './dates';
import { buildTaskViews, summarize, toGoalView } from './metrics';
import { generateSimulatedPlan, SIMULATED_PLAN_NOTICE } from './planner';
import { buildReflectionContext } from './reflectionContext';
import { generateReflectionSummary } from './reflectionSummary';
import { createSampleWorkspace } from './sampleData';
import { buildSnapshot, type WorkspaceSnapshot } from './snapshot';
import type {
  GoalInput,
  GoalPatch,
  PlanInput,
  PlanItemMove,
  PlanItemPatch,
  RawGoal,
  RawPostponement,
  RawTask,
  ReflectionInput,
  TaskInput,
  TaskPatch,
  WorkspaceData,
} from './types';
import { createEmptyWorkspace, loadWorkspace, saveWorkspace } from './workspaceStore';

export class WorkspaceError extends Error {
  code: string;

  constructor(message: string, code = 'workspace_error') {
    super(message);
    this.name = 'WorkspaceError';
    this.code = code;
  }
}

let fallbackId = 0;
function newId(prefix: string): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  fallbackId += 1;
  return `${prefix}-${Date.now()}-${fallbackId}`;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

function cleanTitle(value: string, label = 'Title'): string {
  const title = value.trim();
  if (!title) throw new WorkspaceError(`${label} is required.`, 'invalid_title');
  if (title.length > 160) throw new WorkspaceError(`${label} is too long.`, 'invalid_title');
  return title;
}

function cleanText(value: string | undefined, max = 4000): string {
  return (value ?? '').trim().slice(0, max);
}

function cleanEstimate(value: number | null | undefined): number | null {
  if (value === null || value === undefined || Number.isNaN(value)) return null;
  const rounded = Math.round(value);
  if (rounded <= 0) return null;
  return Math.min(1440, rounded);
}

function parseClockTime(value: string): number {
  const minutes = clockToMinutes(value);
  return Number.isFinite(minutes) ? minutes : 9 * 60;
}

function formatClockTime(totalMinutes: number): string {
  return minutesToClock(Math.round(totalMinutes));
}

/**
 * Re-flows a plan after an edit or reorder: every block keeps its duration and
 * starts where the previous one ends, beginning at the original first start time.
 */
function reschedulePlanItems(items: PlanItem[]): void {
  if (items.length === 0) return;
  let cursor = parseClockTime(items[0].startTime);
  for (const item of items) {
    item.startTime = formatClockTime(cursor);
    item.endTime = formatClockTime(cursor + item.durationMinutes);
    cursor += item.durationMinutes;
  }
}

function cleanDateKey(key: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) {
    throw new WorkspaceError('Choose a valid date.', 'invalid_date');
  }
  const date = new Date(`${key}T12:00:00`);
  if (Number.isNaN(date.getTime())) {
    throw new WorkspaceError('Choose a valid date.', 'invalid_date');
  }
  return key;
}

export class LocalWorkspaceService {
  private workspace: WorkspaceData;

  constructor(user: User, workspace?: WorkspaceData) {
    this.workspace = workspace ?? loadWorkspace(user.id) ?? createEmptyWorkspace(user);
  }

  private commit(now = new Date()): WorkspaceSnapshot {
    this.workspace.updatedAt = now.toISOString();
    const { snapshot } = buildSnapshot(this.workspace, now);
    saveWorkspace(this.workspace);
    return snapshot;
  }

  private build(now = new Date()): WorkspaceSnapshot {
    const { snapshot, achievementsChanged } = buildSnapshot(this.workspace, now);
    if (achievementsChanged) saveWorkspace(this.workspace);
    return snapshot;
  }

  getSnapshot(now = new Date()): WorkspaceSnapshot {
    return this.build(now);
  }

  refresh(now = new Date()): WorkspaceSnapshot {
    return this.build(now);
  }

  private save(now = new Date()): WorkspaceSnapshot {
    return this.commit(now);
  }

  private findTask(taskId: string): RawTask {
    const task = this.workspace.tasks.find((item) => item.id === taskId);
    if (!task) throw new WorkspaceError('Task not found.', 'task_not_found');
    return task;
  }

  private findGoal(goalId: string): RawGoal {
    const goal = this.workspace.goals.find((item) => item.id === goalId);
    if (!goal) throw new WorkspaceError('Goal not found.', 'goal_not_found');
    return goal;
  }

  private findPlan(planId: string): Plan {
    const plan = this.workspace.plans.find((item) => item.id === planId);
    if (!plan) throw new WorkspaceError('Plan not found.', 'plan_not_found');
    return plan;
  }

  createTask(input: TaskInput): WorkspaceSnapshot {
    const now = new Date();
    const goalId =
      input.goalId && this.workspace.goals.some((goal) => goal.id === input.goalId)
        ? input.goalId
        : null;

    const task: RawTask = {
      id: newId('task'),
      goalId,
      title: cleanTitle(input.title, 'Task title'),
      description: cleanText(input.description),
      category: cleanText(input.category, 40) || 'General',
      priority: input.priority ?? 'medium',
      status: input.status ?? 'not_started',
      deadline: input.deadline ?? null,
      estimatedDuration: cleanEstimate(input.estimatedDuration),
      actualDuration: null,
      completedAt: null,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
      records: [],
    };

    this.workspace.tasks.push(task);
    return this.save(now);
  }

  updateTask(taskId: string, patch: TaskPatch): WorkspaceSnapshot {
    const task = this.findTask(taskId);
    const now = new Date();

    if (patch.title !== undefined) task.title = cleanTitle(patch.title, 'Task title');
    if (patch.description !== undefined) task.description = cleanText(patch.description);
    if (patch.category !== undefined) task.category = cleanText(patch.category, 40) || 'General';
    if (patch.priority !== undefined) task.priority = patch.priority;
    if (patch.status !== undefined) task.status = patch.status;
    if (patch.deadline !== undefined) task.deadline = patch.deadline;
    if (patch.estimatedDuration !== undefined) {
      task.estimatedDuration = cleanEstimate(patch.estimatedDuration);
    }
    if (patch.actualDuration !== undefined) {
      task.actualDuration = cleanEstimate(patch.actualDuration);
    }
    if (patch.goalId !== undefined) {
      if (patch.goalId === null) {
        task.goalId = null;
      } else {
        this.findGoal(patch.goalId);
        task.goalId = patch.goalId;
      }
    }

    task.updatedAt = now.toISOString();
    return this.save(now);
  }

  completeTask(taskId: string, actualDuration?: number | null): WorkspaceSnapshot {
    const task = this.findTask(taskId);
    if (task.completedAt) {
      throw new WorkspaceError('This task is already completed.', 'already_completed');
    }
    const now = new Date();
    task.completedAt = now.toISOString();
    task.status = 'completed';
    task.updatedAt = now.toISOString();
    if (actualDuration !== undefined) task.actualDuration = cleanEstimate(actualDuration);
    return this.save(now);
  }

  reopenTask(taskId: string): WorkspaceSnapshot {
    const task = this.findTask(taskId);
    const now = new Date();
    task.completedAt = null;
    task.status = 'not_started';
    task.updatedAt = now.toISOString();
    return this.save(now);
  }

  postponeTask(
    taskId: string,
    input: { newDeadline?: string | null; reason: string },
  ): WorkspaceSnapshot {
    const task = this.findTask(taskId);
    if (task.completedAt) {
      throw new WorkspaceError('Completed tasks cannot be postponed.', 'already_completed');
    }
    const reason = cleanText(input.reason, 500);
    if (!reason) {
      throw new WorkspaceError('Record why the deadline is moving.', 'missing_reason');
    }

    const now = new Date();
    const record: RawPostponement = {
      id: newId('postpone'),
      previousDeadline: task.deadline,
      newDeadline: input.newDeadline ?? task.deadline,
      reason,
      createdAt: now.toISOString(),
    };
    task.records.push(record);
    task.deadline = record.newDeadline;
    task.status = 'postponed';
    task.updatedAt = now.toISOString();
    return this.save(now);
  }

  deleteTask(taskId: string): WorkspaceSnapshot {
    this.findTask(taskId);
    this.workspace.tasks = this.workspace.tasks.filter((task) => task.id !== taskId);
    return this.save();
  }

  createGoal(input: GoalInput): WorkspaceSnapshot {
    const now = new Date();
    const goal: RawGoal = {
      id: newId('goal'),
      title: cleanTitle(input.title, 'Goal title'),
      description: cleanText(input.description),
      targetDate: input.targetDate ?? null,
      status: 'active',
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };
    this.workspace.goals.push(goal);
    return this.save(now);
  }

  updateGoal(goalId: string, patch: GoalPatch): WorkspaceSnapshot {
    const goal = this.findGoal(goalId);
    const now = new Date();
    if (patch.title !== undefined) goal.title = cleanTitle(patch.title, 'Goal title');
    if (patch.description !== undefined) goal.description = cleanText(patch.description);
    if (patch.targetDate !== undefined) goal.targetDate = patch.targetDate;
    if (patch.status !== undefined) goal.status = patch.status;
    goal.updatedAt = now.toISOString();
    return this.save(now);
  }

  deleteGoal(goalId: string): WorkspaceSnapshot {
    this.findGoal(goalId);
    this.workspace.goals = this.workspace.goals.filter((goal) => goal.id !== goalId);
    for (const task of this.workspace.tasks) {
      if (task.goalId === goalId) task.goalId = null;
    }
    return this.save();
  }

  async generatePlan(input: PlanInput): Promise<WorkspaceSnapshot> {
    const date = cleanDateKey(input.date);
    const availableMinutes = Math.min(
      720,
      Math.max(30, Math.round(Number(input.availableMinutes) || this.workspace.preferences.defaultPlanMinutes)),
    );
    await delay(650);
    const now = new Date();
    const tasks = buildTaskViews(this.workspace.tasks, this.workspace.goals, now);
    const content = generateSimulatedPlan({
      date,
      availableMinutes,
      focusText: input.focusText,
      tasks,
      preferences: this.workspace.preferences,
    });

    const plan: Plan = {
      id: newId('plan'),
      planDate: date,
      availableMinutes,
      source: 'simulated',
      plan: content,
      notice: SIMULATED_PLAN_NOTICE,
      createdAt: now.toISOString(),
      itemCount: content.items.length,
      doneCount: 0,
    };
    this.workspace.plans.push(plan);
    return this.save(now);
  }

  deletePlan(planId: string): WorkspaceSnapshot {
    this.findPlan(planId);
    this.workspace.plans = this.workspace.plans.filter((plan) => plan.id !== planId);
    return this.save();
  }

  togglePlanItem(planId: string, itemId: string): WorkspaceSnapshot {
    const plan = this.findPlan(planId);
    const item = plan.plan.items.find((entry) => entry.id === itemId);
    if (!item) throw new WorkspaceError('Plan item not found.', 'plan_item_not_found');
    item.done = !item.done;
    plan.doneCount = plan.plan.items.filter((entry) => entry.done).length;
    return this.save();
  }

  updatePlanNotes(planId: string, notes: string): WorkspaceSnapshot {
    const plan = this.findPlan(planId);
    plan.plan.notes = cleanText(notes, 2000);
    return this.save();
  }

  acceptPlan(planId: string): WorkspaceSnapshot {
    const plan = this.findPlan(planId);
    plan.acceptedAt = new Date().toISOString();
    return this.save();
  }

  updatePlanItem(
    planId: string,
    itemId: string,
    patch: PlanItemPatch,
  ): WorkspaceSnapshot {
    const plan = this.findPlan(planId);
    const item = plan.plan.items.find((entry) => entry.id === itemId);
    if (!item) throw new WorkspaceError('Plan item not found.', 'plan_item_not_found');

    if (patch.title !== undefined) {
      item.title = cleanTitle(patch.title, 'Block title');
    }
    if (patch.durationMinutes !== undefined) {
      const minutes = Math.round(Number(patch.durationMinutes));
      if (!Number.isFinite(minutes)) {
        throw new WorkspaceError('Enter a valid duration.', 'invalid_duration');
      }
      item.durationMinutes = Math.min(240, Math.max(5, minutes));
    }

    reschedulePlanItems(plan.plan.items);
    plan.acceptedAt = null;
    return this.save();
  }

  movePlanItem(planId: string, itemId: string, direction: PlanItemMove): WorkspaceSnapshot {
    const plan = this.findPlan(planId);
    const items = plan.plan.items;
    const index = items.findIndex((entry) => entry.id === itemId);
    if (index === -1) throw new WorkspaceError('Plan item not found.', 'plan_item_not_found');

    const target = direction === 'up' ? index - 1 : index + 1;
    if (target < 0 || target >= items.length) return this.save();

    [items[index], items[target]] = [items[target], items[index]];
    reschedulePlanItems(items);
    plan.acceptedAt = null;
    return this.save();
  }

  saveReflection(input: ReflectionInput): WorkspaceSnapshot {
    const date = cleanDateKey(input.date);
    const now = new Date();
    const existing = this.workspace.reflections.find(
      (reflection) => reflection.reflectionDate === date,
    );
    const tasks = buildTaskViews(this.workspace.tasks, this.workspace.goals, now);
    const summary = summarize(tasks, now);

    let aiSummary = existing?.aiSummary ?? null;
    let summarySource = existing?.summarySource ?? null;

    if (input.generateSummary) {
      aiSummary = generateReflectionSummary({
        userName: this.workspace.profile.name,
        date,
        completedTasks: input.completedTasks,
        unfinishedTasks: input.unfinishedTasks,
        postponementReasons: input.postponementReasons,
        learnings: input.learnings,
        tomorrowGoals: input.tomorrowGoals,
        tasks,
        summary,
      });
      summarySource = 'simulated';
    }

    if (existing) {
      existing.completedTasks = cleanText(input.completedTasks);
      existing.unfinishedTasks = cleanText(input.unfinishedTasks);
      existing.postponementReasons = cleanText(input.postponementReasons);
      existing.learnings = cleanText(input.learnings);
      existing.tomorrowGoals = cleanText(input.tomorrowGoals);
      existing.aiSummary = aiSummary;
      existing.summarySource = summarySource;
      existing.updatedAt = now.toISOString();
    } else {
      const reflection: Reflection = {
        id: newId('reflection'),
        reflectionDate: date,
        completedTasks: cleanText(input.completedTasks),
        unfinishedTasks: cleanText(input.unfinishedTasks),
        postponementReasons: cleanText(input.postponementReasons),
        learnings: cleanText(input.learnings),
        tomorrowGoals: cleanText(input.tomorrowGoals),
        aiSummary,
        summarySource,
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      };
      this.workspace.reflections.push(reflection);
    }

    return this.save(now);
  }

  regenerateReflectionSummary(reflectionId: string): WorkspaceSnapshot {
    const reflection = this.workspace.reflections.find((item) => item.id === reflectionId);
    if (!reflection) throw new WorkspaceError('Reflection not found.', 'reflection_not_found');
    const now = new Date();
    const tasks = buildTaskViews(this.workspace.tasks, this.workspace.goals, now);
    reflection.aiSummary = generateReflectionSummary({
      userName: this.workspace.profile.name,
      date: reflection.reflectionDate,
      completedTasks: reflection.completedTasks,
      unfinishedTasks: reflection.unfinishedTasks,
      postponementReasons: reflection.postponementReasons,
      learnings: reflection.learnings,
      tomorrowGoals: reflection.tomorrowGoals,
      tasks,
      summary: summarize(tasks, now),
    });
    reflection.summarySource = 'simulated';
    reflection.updatedAt = now.toISOString();
    return this.save(now);
  }

  deleteReflection(reflectionId: string): WorkspaceSnapshot {
    const exists = this.workspace.reflections.some((item) => item.id === reflectionId);
    if (!exists) throw new WorkspaceError('Reflection not found.', 'reflection_not_found');
    this.workspace.reflections = this.workspace.reflections.filter(
      (item) => item.id !== reflectionId,
    );
    return this.save();
  }

  getReflectionContext(date: string): ReflectionContext {
    const key = cleanDateKey(date);
    const now = new Date();
    const tasks = buildTaskViews(this.workspace.tasks, this.workspace.goals, now);
    const goals = this.workspace.goals.map((goal) => toGoalView(goal, tasks, now));
    return buildReflectionContext({
      date: key,
      tasks,
      goals,
      reflections: this.workspace.reflections,
      now,
    });
  }

  async sendAssistantMessage(message: string): Promise<WorkspaceSnapshot> {
    const text = cleanText(message, 1000);
    if (!text) throw new WorkspaceError('Write a message first.', 'empty_message');
    const now = new Date();
    const tasks = buildTaskViews(this.workspace.tasks, this.workspace.goals, now);
    const goals = this.workspace.goals.map((goal) => toGoalView(goal, tasks, now));
    const summary = summarize(tasks, now);
    const reflections = [...this.workspace.reflections].sort((a, b) =>
      b.reflectionDate.localeCompare(a.reflectionDate),
    );

    this.workspace.conversations.push({
      id: newId('message'),
      role: 'user',
      content: text,
      source: null,
      createdAt: now.toISOString(),
    });

    await delay(750);

    const reply = generateAssistantReply({
      userName: this.workspace.profile.name,
      message: text,
      tasks,
      goals,
      summary,
      reflections,
      preferences: this.workspace.preferences,
    });

    this.workspace.conversations.push({
      id: newId('message'),
      role: 'assistant',
      content: reply,
      source: 'simulated',
      createdAt: new Date().toISOString(),
    });
    this.workspace.conversations = this.workspace.conversations.slice(-100);
    return this.save();
  }

  clearConversation(): WorkspaceSnapshot {
    this.workspace.conversations = [];
    return this.save();
  }

  updatePreferences(patch: Partial<Preferences>): WorkspaceSnapshot {
    const next: Preferences = {
      ...this.workspace.preferences,
      ...patch,
      notifications: {
        ...this.workspace.preferences.notifications,
        ...(patch.notifications ?? {}),
      },
    };

    if (!/^\d{2}:\d{2}$/.test(next.focusStart) || !/^\d{2}:\d{2}$/.test(next.focusEnd)) {
      throw new WorkspaceError('Focus hours must use a valid time.', 'invalid_preferences');
    }
    if (next.focusStart === next.focusEnd) {
      throw new WorkspaceError('Focus start and end cannot be the same time.', 'invalid_preferences');
    }
    next.dailyTarget = Math.min(12, Math.max(1, Math.round(next.dailyTarget)));
    next.defaultPlanMinutes = Math.min(720, Math.max(30, Math.round(next.defaultPlanMinutes)));

    this.workspace.preferences = next;
    this.workspace.profile.preferences = next;
    return this.save();
  }

  updateProfile(updates: { name?: string; email?: string }): WorkspaceSnapshot {
    if (updates.name !== undefined) {
      this.workspace.profile.name = cleanTitle(updates.name, 'Name');
    }
    if (updates.email !== undefined) {
      this.workspace.profile.email = updates.email.trim().toLowerCase();
    }
    return this.save();
  }

  clearWorkspace(): WorkspaceSnapshot {
    const profile = this.workspace.profile;
    const preferences = this.workspace.preferences;
    const empty = createEmptyWorkspace(profile);
    empty.preferences = preferences;
    empty.profile = { ...profile, preferences };
    this.workspace = empty;
    return this.save();
  }

  loadSampleWorkspace(): WorkspaceSnapshot {
    const profile = this.workspace.profile;
    this.workspace = createSampleWorkspace(profile);
    return this.save();
  }

  exportWorkspace(): WorkspaceData {
    return structuredClone(this.workspace);
  }
}

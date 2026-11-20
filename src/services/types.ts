import type {
  AchievementDefinition,
  AssistantMessage,
  Plan,
  Preferences,
  Priority,
  Profile,
  Reflection,
  ReflectionContext,
  StoredTaskStatus,
} from '@/lib/types';
import type { WorkspaceSnapshot } from './snapshot';

export interface RawPostponement {
  id: string;
  previousDeadline: string | null;
  newDeadline: string | null;
  reason: string;
  createdAt: string;
}

export interface RawTask {
  id: string;
  goalId: string | null;
  title: string;
  description: string;
  category: string;
  priority: Priority;
  status: StoredTaskStatus;
  deadline: string | null;
  estimatedDuration: number | null;
  actualDuration: number | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  records: RawPostponement[];
}

export interface RawGoal {
  id: string;
  title: string;
  description: string;
  targetDate: string | null;
  status: 'active' | 'completed' | 'archived';
  createdAt: string;
  updatedAt: string;
}

export interface EarnedAchievement {
  type: string;
  earnedAt: string;
}

export interface WorkspaceData {
  version: 1;
  tasks: RawTask[];
  goals: RawGoal[];
  plans: Plan[];
  reflections: Reflection[];
  achievements: EarnedAchievement[];
  conversations: AssistantMessage[];
  profile: Profile;
  preferences: Preferences;
  isSampleData: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TaskInput {
  title: string;
  description?: string;
  category?: string;
  priority?: Priority;
  status?: Exclude<StoredTaskStatus, 'completed'>;
  deadline?: string | null;
  estimatedDuration?: number | null;
  goalId?: string | null;
}

export interface TaskPatch {
  title?: string;
  description?: string;
  category?: string;
  priority?: Priority;
  status?: Exclude<StoredTaskStatus, 'completed'>;
  deadline?: string | null;
  estimatedDuration?: number | null;
  actualDuration?: number | null;
  goalId?: string | null;
}

export interface GoalInput {
  title: string;
  description?: string;
  targetDate?: string | null;
}

export interface GoalPatch {
  title?: string;
  description?: string;
  targetDate?: string | null;
  status?: 'active' | 'completed' | 'archived';
}

export interface PlanInput {
  date: string;
  availableMinutes: number;
  focusText?: string;
}

export interface PlanItemPatch {
  title?: string;
  durationMinutes?: number;
}

export type PlanItemMove = 'up' | 'down';

export interface ReflectionInput {
  date: string;
  completedTasks: string;
  unfinishedTasks: string;
  postponementReasons: string;
  learnings: string;
  tomorrowGoals: string;
  generateSummary: boolean;
}

export interface AuthAccount {
  id: string;
  name: string;
  email: string;
  salt: string;
  passwordHash: string;
  createdAt: string;
}

export interface DemoResetRequest {
  token: string;
  email: string;
  expiresAt: string;
}

export interface PlannerContext {
  tasksRaw: RawTask[];
  preferences: Preferences;
  profile: Profile;
}

/**
 * The surface both workspace adapters implement.
 *
 * Local mode returns synchronously; HTTP mode resolves from the API. Callers
 * already `await` every action, so the union is safe for both.
 */
export type WorkspaceActionResult = WorkspaceSnapshot | Promise<WorkspaceSnapshot>;

export interface WorkspaceServiceContract {
  getSnapshot(): WorkspaceSnapshot;
  refresh(): WorkspaceSnapshot;
  createTask(input: TaskInput): WorkspaceActionResult;
  updateTask(taskId: string, patch: TaskPatch): WorkspaceActionResult;
  completeTask(taskId: string, actualDuration?: number | null): WorkspaceActionResult;
  reopenTask(taskId: string): WorkspaceActionResult;
  postponeTask(
    taskId: string,
    input: { newDeadline?: string | null; reason: string },
  ): WorkspaceActionResult;
  deleteTask(taskId: string): WorkspaceActionResult;
  createGoal(input: GoalInput): WorkspaceActionResult;
  updateGoal(goalId: string, patch: GoalPatch): WorkspaceActionResult;
  deleteGoal(goalId: string): WorkspaceActionResult;
  generatePlan(input: PlanInput): WorkspaceActionResult;
  deletePlan(planId: string): WorkspaceActionResult;
  togglePlanItem(planId: string, itemId: string): WorkspaceActionResult;
  updatePlanNotes(planId: string, notes: string): WorkspaceActionResult;
  acceptPlan(planId: string): WorkspaceActionResult;
  updatePlanItem(planId: string, itemId: string, patch: PlanItemPatch): WorkspaceActionResult;
  movePlanItem(planId: string, itemId: string, direction: PlanItemMove): WorkspaceActionResult;
  saveReflection(input: ReflectionInput): WorkspaceActionResult;
  regenerateReflectionSummary(reflectionId: string): WorkspaceActionResult;
  deleteReflection(reflectionId: string): WorkspaceActionResult;
  sendAssistantMessage(message: string): WorkspaceActionResult;
  clearConversation(): WorkspaceActionResult;
  updatePreferences(patch: Partial<Preferences>): WorkspaceActionResult;
  updateProfile(updates: { name?: string; email?: string }): WorkspaceActionResult;
  clearWorkspace(): WorkspaceActionResult;
  loadSampleWorkspace(): WorkspaceActionResult;
  exportWorkspace(): WorkspaceData;
  getReflectionContext(date: string): ReflectionContext;
}

export interface AchievementComputation {
  achievements: import('@/lib/types').Achievement[];
  earnedRecords: EarnedAchievement[];
}

export type StoredAchievement = AchievementDefinition & { earnedAt: string };

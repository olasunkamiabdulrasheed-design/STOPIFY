import type { Preferences, ReflectionContext } from '@/lib/types';
import type { WorkspaceSnapshot } from './snapshot';
import { buildReflectionContext } from './reflectionContext';
import { stopifyApi } from './api/stopifyApi';
import type {
  GoalInput,
  GoalPatch,
  PlanInput,
  PlanItemMove,
  PlanItemPatch,
  ReflectionInput,
  TaskInput,
  TaskPatch,
  WorkspaceData,
  WorkspaceServiceContract,
} from './types';

/**
 * REST-backed workspace adapter.
 *
 * Enabled with `VITE_DATA_MODE=http` plus `VITE_API_BASE_URL`. Every mutation
 * returns the canonical `WorkspaceSnapshot` from the server, so the UI replaces
 * state in a single step. The backend contract lives in
 * `docs/BACKEND_INTEGRATION.md`.
 */
export class HttpWorkspaceService implements WorkspaceServiceContract {
  private current: WorkspaceSnapshot;
  private exported: WorkspaceData | null;

  constructor(snapshot: WorkspaceSnapshot, exported: WorkspaceData | null = null) {
    this.current = snapshot;
    this.exported = exported;
  }

  /**
   * Establishes the session and pulls the first snapshot.
   *
   * Authentication for the HTTP mode is owned by the backend team: store the
   * bearer token with `stopifyApi.session.setToken()` after login.
   */
  static async connect(): Promise<HttpWorkspaceService> {
    const snapshot = await stopifyApi.workspace.get();
    const exported = await stopifyApi.workspace.export().catch(() => null);
    return new HttpWorkspaceService(snapshot, exported);
  }

  private adopt(snapshot: WorkspaceSnapshot): WorkspaceSnapshot {
    this.current = snapshot;
    return snapshot;
  }

  getSnapshot(): WorkspaceSnapshot {
    return this.current;
  }

  refresh(): WorkspaceSnapshot {
    void stopifyApi.workspace
      .get()
      .then((snapshot) => {
        this.current = snapshot;
      })
      .catch(() => {
        /* a background refresh should never interrupt work */
      });
    return this.current;
  }

  private async reload(): Promise<WorkspaceSnapshot> {
    return this.adopt(await stopifyApi.workspace.get());
  }

  async createTask(input: TaskInput): Promise<WorkspaceSnapshot> {
    return this.adopt(await stopifyApi.tasks.create(input));
  }

  async updateTask(taskId: string, patch: TaskPatch): Promise<WorkspaceSnapshot> {
    return this.adopt(await stopifyApi.tasks.update(taskId, patch));
  }

  async completeTask(
    taskId: string,
    actualDuration?: number | null,
  ): Promise<WorkspaceSnapshot> {
    return this.adopt(await stopifyApi.tasks.complete(taskId, actualDuration));
  }

  async reopenTask(taskId: string): Promise<WorkspaceSnapshot> {
    return this.adopt(await stopifyApi.tasks.reopen(taskId));
  }

  async postponeTask(
    taskId: string,
    input: { newDeadline?: string | null; reason: string },
  ): Promise<WorkspaceSnapshot> {
    return this.adopt(await stopifyApi.tasks.postpone(taskId, input));
  }

  async deleteTask(taskId: string): Promise<WorkspaceSnapshot> {
    return this.adopt(await stopifyApi.tasks.remove(taskId));
  }

  async createGoal(input: GoalInput): Promise<WorkspaceSnapshot> {
    return this.adopt(await stopifyApi.goals.create(input));
  }

  async updateGoal(goalId: string, patch: GoalPatch): Promise<WorkspaceSnapshot> {
    return this.adopt(await stopifyApi.goals.update(goalId, patch));
  }

  async deleteGoal(goalId: string): Promise<WorkspaceSnapshot> {
    return this.adopt(await stopifyApi.goals.remove(goalId));
  }

  async generatePlan(input: PlanInput): Promise<WorkspaceSnapshot> {
    return this.adopt(await stopifyApi.plans.generate(input));
  }

  async deletePlan(planId: string): Promise<WorkspaceSnapshot> {
    return this.adopt(await stopifyApi.plans.remove(planId));
  }

  async togglePlanItem(planId: string, itemId: string): Promise<WorkspaceSnapshot> {
    return this.adopt(await stopifyApi.plans.toggleItem(planId, itemId));
  }

  async updatePlanNotes(planId: string, notes: string): Promise<WorkspaceSnapshot> {
    return this.adopt(await stopifyApi.plans.updateNotes(planId, notes));
  }

  async acceptPlan(planId: string): Promise<WorkspaceSnapshot> {
    return this.adopt(await stopifyApi.plans.accept(planId));
  }

  async updatePlanItem(
    planId: string,
    itemId: string,
    patch: PlanItemPatch,
  ): Promise<WorkspaceSnapshot> {
    return this.adopt(await stopifyApi.plans.updateItem(planId, itemId, patch));
  }

  async movePlanItem(
    planId: string,
    itemId: string,
    direction: PlanItemMove,
  ): Promise<WorkspaceSnapshot> {
    return this.adopt(await stopifyApi.plans.moveItem(planId, itemId, direction));
  }

  async saveReflection(input: ReflectionInput): Promise<WorkspaceSnapshot> {
    return this.adopt(await stopifyApi.reflections.save(input));
  }

  async regenerateReflectionSummary(reflectionId: string): Promise<WorkspaceSnapshot> {
    return this.adopt(await stopifyApi.reflections.regenerate(reflectionId));
  }

  async deleteReflection(reflectionId: string): Promise<WorkspaceSnapshot> {
    return this.adopt(await stopifyApi.reflections.remove(reflectionId));
  }

  async sendAssistantMessage(message: string): Promise<WorkspaceSnapshot> {
    return this.adopt(await stopifyApi.assistant.send(message));
  }

  async clearConversation(): Promise<WorkspaceSnapshot> {
    return this.adopt(await stopifyApi.assistant.clear());
  }

  async updatePreferences(patch: Partial<Preferences>): Promise<WorkspaceSnapshot> {
    return this.adopt(await stopifyApi.workspace.updatePreferences(patch));
  }

  async updateProfile(updates: { name?: string; email?: string }): Promise<WorkspaceSnapshot> {
    return this.adopt(await stopifyApi.workspace.updateProfile(updates));
  }

  async clearWorkspace(): Promise<WorkspaceSnapshot> {
    return this.adopt(await stopifyApi.workspace.clear());
  }

  async loadSampleWorkspace(): Promise<WorkspaceSnapshot> {
    return this.adopt(await stopifyApi.workspace.loadSample());
  }

  exportWorkspace(): WorkspaceData {
    if (!this.exported) {
      throw new Error(
        'The workspace export is not available yet. Reload with the backend running.',
      );
    }
    return structuredClone(this.exported);
  }

  getReflectionContext(date: string): ReflectionContext {
    return buildReflectionContext({
      date,
      tasks: this.current.tasks,
      goals: this.current.goals,
      reflections: this.current.reflections,
    });
  }

  /** Pulls a fresh snapshot eagerly, used by the provider on focus/interval. */
  async reloadNow(): Promise<WorkspaceSnapshot> {
    return this.reload();
  }
}

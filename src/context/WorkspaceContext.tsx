import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { toast } from 'sonner';
import type { Preferences, ReflectionContext } from '@/lib/types';
import { useAuth } from '@/context/AuthContext';
import { errorMessage, notifyAchievements } from '@/lib/toast';
import type { WorkspaceSnapshot } from '@/services/snapshot';
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
} from '@/services/types';
import { LocalWorkspaceService } from '@/services/workspaceService';
import { HttpWorkspaceService } from '@/services/httpWorkspaceService';
import { dataMode } from '@/services/api/stopifyApi';

interface RunOptions {
  notifyOnUnlock?: boolean;
}

interface WorkspaceActions {
  createTask: (input: TaskInput) => Promise<WorkspaceSnapshot>;
  updateTask: (taskId: string, patch: TaskPatch) => Promise<WorkspaceSnapshot>;
  completeTask: (taskId: string, actualDuration?: number | null) => Promise<WorkspaceSnapshot>;
  reopenTask: (taskId: string) => Promise<WorkspaceSnapshot>;
  postponeTask: (
    taskId: string,
    input: { newDeadline?: string | null; reason: string },
  ) => Promise<WorkspaceSnapshot>;
  deleteTask: (taskId: string) => Promise<WorkspaceSnapshot>;
  createGoal: (input: GoalInput) => Promise<WorkspaceSnapshot>;
  updateGoal: (goalId: string, patch: GoalPatch) => Promise<WorkspaceSnapshot>;
  deleteGoal: (goalId: string) => Promise<WorkspaceSnapshot>;
  generatePlan: (input: PlanInput) => Promise<WorkspaceSnapshot>;
  deletePlan: (planId: string) => Promise<WorkspaceSnapshot>;
  togglePlanItem: (planId: string, itemId: string) => Promise<WorkspaceSnapshot>;
  updatePlanNotes: (planId: string, notes: string) => Promise<WorkspaceSnapshot>;
  acceptPlan: (planId: string) => Promise<WorkspaceSnapshot>;
  updatePlanItem: (
    planId: string,
    itemId: string,
    patch: PlanItemPatch,
  ) => Promise<WorkspaceSnapshot>;
  movePlanItem: (
    planId: string,
    itemId: string,
    direction: PlanItemMove,
  ) => Promise<WorkspaceSnapshot>;
  saveReflection: (input: ReflectionInput) => Promise<WorkspaceSnapshot>;
  regenerateReflectionSummary: (reflectionId: string) => Promise<WorkspaceSnapshot>;
  deleteReflection: (reflectionId: string) => Promise<WorkspaceSnapshot>;
  sendAssistantMessage: (message: string) => Promise<WorkspaceSnapshot>;
  clearConversation: () => Promise<WorkspaceSnapshot>;
  updatePreferences: (patch: Partial<Preferences>) => Promise<WorkspaceSnapshot>;
  updateWorkspaceProfile: (updates: { name?: string; email?: string }) => Promise<WorkspaceSnapshot>;
  clearWorkspace: () => Promise<WorkspaceSnapshot>;
  loadSampleWorkspace: () => Promise<WorkspaceSnapshot>;
  exportWorkspace: () => WorkspaceData;
  getReflectionContext: (date: string) => ReflectionContext;
  refresh: () => WorkspaceSnapshot;
}

interface WorkspaceContextValue {
  snapshot: WorkspaceSnapshot | null;
  loading: boolean;
  error: string | null;
  actions: WorkspaceActions;
}

const WorkspaceContext = createContext<WorkspaceContextValue | undefined>(undefined);

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const [snapshot, setSnapshot] = useState<WorkspaceSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const serviceRef = useRef<WorkspaceServiceContract | null>(null);
  const snapshotRef = useRef<WorkspaceSnapshot | null>(null);

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      serviceRef.current = null;
      snapshotRef.current = null;
      setSnapshot(null);
      setLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    const connect = async () => {
      try {
        const service: WorkspaceServiceContract =
          dataMode === 'http'
            ? await HttpWorkspaceService.connect()
            : new LocalWorkspaceService(user);
        if (cancelled) return;
        const initial = service.getSnapshot();
        serviceRef.current = service;
        snapshotRef.current = initial;
        setSnapshot(initial);
      } catch (caught) {
        if (cancelled) return;
        serviceRef.current = null;
        snapshotRef.current = null;
        setError(errorMessage(caught));
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void connect();
    return () => {
      cancelled = true;
    };
  }, [user, authLoading]);

  useEffect(() => {
    if (!user) return;
    const interval = window.setInterval(() => {
      const service = serviceRef.current;
      if (!service) return;
      try {
        const next = service.refresh();
        snapshotRef.current = next;
        setSnapshot(next);
      } catch {
        /* a background refresh should never interrupt work */
      }
    }, 60_000);
    return () => window.clearInterval(interval);
  }, [user]);

  const applySnapshot = useCallback(
    (next: WorkspaceSnapshot, previous: WorkspaceSnapshot | null, notifyOnUnlock: boolean) => {
      snapshotRef.current = next;
      setSnapshot(next);
      setError(null);

      if (!previous || !notifyOnUnlock) return;
      const previousEarned = new Set(
        previous.achievements.filter((achievement) => achievement.earned).map((item) => item.type),
      );
      const newlyEarned = next.achievements.filter(
        (achievement) => achievement.earned && !previousEarned.has(achievement.type),
      );
      notifyAchievements(newlyEarned);
    },
    [],
  );

  const run = useCallback(
    async (
      action: (service: WorkspaceServiceContract) => WorkspaceSnapshot | Promise<WorkspaceSnapshot>,
      options: RunOptions = { notifyOnUnlock: true },
    ): Promise<WorkspaceSnapshot> => {
      const service = serviceRef.current;
      if (!service) throw new Error('Your workspace is not ready.');
      const previous = snapshotRef.current;
      const next = await action(service);
      applySnapshot(next, previous, options.notifyOnUnlock !== false);
      return next;
    },
    [applySnapshot],
  );

  const refresh = useCallback(() => {
    const service = serviceRef.current;
    if (!service) throw new Error('Your workspace is not ready.');
    const next = service.refresh();
    applySnapshot(next, snapshotRef.current, false);
    return next;
  }, [applySnapshot]);

  const actions = useMemo<WorkspaceActions>(
    () => ({
      createTask: (input) => run((service) => service.createTask(input)),
      updateTask: (taskId, patch) => run((service) => service.updateTask(taskId, patch)),
      completeTask: (taskId, actualDuration) =>
        run((service) => service.completeTask(taskId, actualDuration)),
      reopenTask: (taskId) => run((service) => service.reopenTask(taskId)),
      postponeTask: (taskId, input) =>
        run((service) => service.postponeTask(taskId, input)),
      deleteTask: (taskId) => run((service) => service.deleteTask(taskId)),
      createGoal: (input) => run((service) => service.createGoal(input)),
      updateGoal: (goalId, patch) => run((service) => service.updateGoal(goalId, patch)),
      deleteGoal: (goalId) => run((service) => service.deleteGoal(goalId)),
      generatePlan: (input) => run((service) => service.generatePlan(input)),
      deletePlan: (planId) => run((service) => service.deletePlan(planId)),
      togglePlanItem: (planId, itemId) =>
        run((service) => service.togglePlanItem(planId, itemId)),
      updatePlanNotes: (planId, notes) =>
        run((service) => service.updatePlanNotes(planId, notes)),
      acceptPlan: (planId) => run((service) => service.acceptPlan(planId)),
      updatePlanItem: (planId, itemId, patch) =>
        run((service) => service.updatePlanItem(planId, itemId, patch)),
      movePlanItem: (planId, itemId, direction) =>
        run((service) => service.movePlanItem(planId, itemId, direction)),
      saveReflection: (input) => run((service) => service.saveReflection(input)),
      regenerateReflectionSummary: (reflectionId) =>
        run((service) => service.regenerateReflectionSummary(reflectionId)),
      deleteReflection: (reflectionId) =>
        run((service) => service.deleteReflection(reflectionId)),
      sendAssistantMessage: (message) =>
        run((service) => service.sendAssistantMessage(message), { notifyOnUnlock: true }),
      clearConversation: () => run((service) => service.clearConversation()),
      updatePreferences: (patch) => run((service) => service.updatePreferences(patch)),
      updateWorkspaceProfile: (updates) =>
        run((service) => service.updateProfile(updates)),
      clearWorkspace: () =>
        run((service) => service.clearWorkspace(), { notifyOnUnlock: false }),
      loadSampleWorkspace: () =>
        run((service) => service.loadSampleWorkspace(), { notifyOnUnlock: false }),
      exportWorkspace: () => {
        const service = serviceRef.current;
        if (!service) throw new Error('Your workspace is not ready.');
        return service.exportWorkspace();
      },
      getReflectionContext: (date) => {
        const service = serviceRef.current;
        if (!service) throw new Error('Your workspace is not ready.');
        return service.getReflectionContext(date);
      },
      refresh,
    }),
    [run, refresh],
  );

  const value = useMemo(
    () => ({ snapshot, loading, error, actions }),
    [snapshot, loading, error, actions],
  );

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspace(): WorkspaceContextValue {
  const context = useContext(WorkspaceContext);
  if (!context) throw new Error('useWorkspace must be used inside WorkspaceProvider');
  return context;
}

export function useWorkspaceSnapshot(): WorkspaceSnapshot {
  const { snapshot, loading } = useWorkspace();
  if (!snapshot) {
    throw new Error(
      loading ? 'Workspace is still loading.' : 'Workspace is unavailable. Sign in again.',
    );
  }
  return snapshot;
}

export function useWorkspaceActions(): WorkspaceActions {
  return useWorkspace().actions;
}

export function workspaceSuccess(message: string): void {
  toast.success(message);
}

import type { Profile, User } from '@/lib/types';
import { readJson, removeRaw, writeJson, STORAGE_KEYS } from './storage';
import type { WorkspaceData } from './types';

export const DEFAULT_PREFERENCES = {
  focusStart: '09:00',
  focusEnd: '18:00',
  dailyTarget: 3,
  defaultPlanMinutes: 240,
  notifications: {
    email: false,
    weekly: false,
  },
};

function workspaceKey(userId: string): string {
  return `${STORAGE_KEYS.workspacePrefix}${userId}`;
}

export function defaultPreferences(): WorkspaceData['preferences'] {
  return {
    ...DEFAULT_PREFERENCES,
    notifications: { ...DEFAULT_PREFERENCES.notifications },
  };
}

export function profileFromUser(user: User): Profile {
  const existing = (user as Partial<Profile>).preferences;
  return {
    ...user,
    preferences: existing
      ? { ...existing, notifications: { ...existing.notifications } }
      : defaultPreferences(),
  };
}

export function createEmptyWorkspace(user: User): WorkspaceData {
  const now = new Date().toISOString();
  const profile = profileFromUser(user);
  return {
    version: 1,
    tasks: [],
    goals: [],
    plans: [],
    reflections: [],
    achievements: [],
    conversations: [],
    profile,
    preferences: profile.preferences,
    isSampleData: false,
    createdAt: now,
    updatedAt: now,
  };
}

function isValidWorkspace(value: unknown): value is WorkspaceData {
  if (!value || typeof value !== 'object') return false;
  const workspace = value as Partial<WorkspaceData>;
  return (
    workspace.version === 1 &&
    Array.isArray(workspace.tasks) &&
    Array.isArray(workspace.goals) &&
    Array.isArray(workspace.plans) &&
    Array.isArray(workspace.reflections) &&
    Array.isArray(workspace.achievements) &&
    Array.isArray(workspace.conversations) &&
    Boolean(workspace.profile) &&
    Boolean(workspace.preferences)
  );
}

export function loadWorkspace(userId: string): WorkspaceData | null {
  const raw = readJson<unknown>(workspaceKey(userId), null);
  return isValidWorkspace(raw) ? raw : null;
}

export function saveWorkspace(workspace: WorkspaceData): void {
  const next = { ...workspace, updatedAt: new Date().toISOString() };
  workspace.updatedAt = next.updatedAt;
  writeJson(workspaceKey(workspace.profile.id), next);
}

export function deleteWorkspace(userId: string): void {
  removeRaw(workspaceKey(userId));
}

export function getOrCreateWorkspace(user: User): WorkspaceData {
  return loadWorkspace(user.id) ?? createEmptyWorkspace(user);
}

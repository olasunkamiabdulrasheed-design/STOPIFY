import type { Preferences, Reflection, User } from '@/lib/types';
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
} from '@/services/types';

export type DataMode = 'local' | 'http';

export const dataMode: DataMode = import.meta.env.VITE_DATA_MODE === 'http' ? 'http' : 'local';

export const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/+$/, '');

const TOKEN_KEY = 'stopify.api.token';

export class ApiClientError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(message: string, status: number, code = 'api_error') {
    super(message);
    this.name = 'ApiClientError';
    this.status = status;
    this.code = code;
  }
}

export interface AuthResponse {
  user: User;
  token: string;
}

export interface ApiSession {
  user: User;
}

interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
  auth?: boolean;
}

function readToken(): string | null {
  try {
    return window.localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

function writeToken(token: string | null): void {
  try {
    if (token) window.localStorage.setItem(TOKEN_KEY, token);
    else window.localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* storage may be unavailable in private modes */
  }
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  if (dataMode !== 'http' || !apiBaseUrl) {
    throw new ApiClientError(
      'HTTP data mode is not configured. Set VITE_DATA_MODE=http and VITE_API_BASE_URL in .env.',
      0,
      'not_configured',
    );
  }

  const { body, auth = true, headers, ...rest } = options;
  const requestHeaders = new Headers(headers);
  requestHeaders.set('Accept', 'application/json');

  if (body !== undefined) {
    requestHeaders.set('Content-Type', 'application/json');
  }
  if (auth) {
    const token = readToken();
    if (token) requestHeaders.set('Authorization', `Bearer ${token}`);
  }

  let response: Response;
  try {
    response = await fetch(`${apiBaseUrl}${path}`, {
      ...rest,
      headers: requestHeaders,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiClientError(
      'Could not reach the STOPIFY API. Check that the backend is running and CORS allows this origin.',
      0,
      'network_error',
    );
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const contentType = response.headers.get('content-type') ?? '';
  const payload: unknown = contentType.includes('application/json')
    ? await response.json().catch(() => null)
    : await response.text().catch(() => '');

  if (!response.ok) {
    const record = (payload ?? {}) as {
      message?: string;
      error?: string | { message?: string; code?: string };
      code?: string;
    };
    const nested = typeof record.error === 'object' ? record.error : null;
    const message =
      nested?.message ??
      (typeof record.error === 'string' ? record.error : undefined) ??
      record.message ??
      `Request failed with status ${response.status}.`;
    const code = nested?.code ?? record.code ?? 'api_error';
    throw new ApiClientError(message, response.status, code);
  }

  return payload as T;
}

/**
 * Typed contract for the optional HTTP backend.
 *
 * The demo runs entirely on LocalWorkspaceService. This client is deliberately
 * unused at runtime unless VITE_DATA_MODE=http is enabled and a backend adapter
 * (or a future HttpWorkspaceService) is wired in.
 *
 * Every workspace mutation returns the canonical WorkspaceSnapshot so the UI can
 * replace state in one step and keep metrics/achievements consistent.
 */
export const stopifyApi = {
  auth: {
    register(input: { name: string; email: string; password: string }): Promise<AuthResponse> {
      return request<AuthResponse>('/api/auth/register', {
        method: 'POST',
        auth: false,
        body: input,
      });
    },
    login(input: { email: string; password: string }): Promise<AuthResponse> {
      return request<AuthResponse>('/api/auth/login', {
        method: 'POST',
        auth: false,
        body: input,
      });
    },
    demo(): Promise<AuthResponse> {
      return request<AuthResponse>('/api/auth/demo', { method: 'POST', auth: false });
    },
    me(): Promise<ApiSession> {
      return request<ApiSession>('/api/auth/me');
    },
    logout(): Promise<void> {
      return request<void>('/api/auth/logout', { method: 'POST' });
    },
    updateProfile(input: { name?: string; email?: string }): Promise<User> {
      return request<User>('/api/auth/profile', { method: 'PATCH', body: input });
    },
    changePassword(input: {
      currentPassword: string;
      newPassword: string;
    }): Promise<void> {
      return request<void>('/api/auth/password', { method: 'POST', body: input });
    },
    deleteAccount(input: { password: string }): Promise<void> {
      return request<void>('/api/auth/account', { method: 'DELETE', body: input });
    },
    requestReset(input: { email: string }): Promise<{ message: string }> {
      return request<{ message: string }>('/api/auth/password/forgot', {
        method: 'POST',
        auth: false,
        body: input,
      });
    },
    resetPassword(input: { token: string; password: string }): Promise<void> {
      return request<void>('/api/auth/password/reset', {
        method: 'POST',
        auth: false,
        body: input,
      });
    },
  },

  workspace: {
    get(): Promise<WorkspaceSnapshot> {
      return request<WorkspaceSnapshot>('/api/workspace');
    },
    export(): Promise<WorkspaceData> {
      return request<WorkspaceData>('/api/workspace/export');
    },
    clear(): Promise<WorkspaceSnapshot> {
      return request<WorkspaceSnapshot>('/api/workspace', { method: 'DELETE' });
    },
    loadSample(): Promise<WorkspaceSnapshot> {
      return request<WorkspaceSnapshot>('/api/workspace/sample', { method: 'POST' });
    },
    updatePreferences(patch: Partial<Preferences>): Promise<WorkspaceSnapshot> {
      return request<WorkspaceSnapshot>('/api/workspace/preferences', {
        method: 'PATCH',
        body: patch,
      });
    },
    updateProfile(input: { name?: string; email?: string }): Promise<WorkspaceSnapshot> {
      return request<WorkspaceSnapshot>('/api/workspace/profile', {
        method: 'PATCH',
        body: input,
      });
    },
  },

  tasks: {
    create(input: TaskInput): Promise<WorkspaceSnapshot> {
      return request<WorkspaceSnapshot>('/api/tasks', { method: 'POST', body: input });
    },
    update(taskId: string, patch: TaskPatch): Promise<WorkspaceSnapshot> {
      return request<WorkspaceSnapshot>(`/api/tasks/${encodeURIComponent(taskId)}`, {
        method: 'PATCH',
        body: patch,
      });
    },
    remove(taskId: string): Promise<WorkspaceSnapshot> {
      return request<WorkspaceSnapshot>(`/api/tasks/${encodeURIComponent(taskId)}`, {
        method: 'DELETE',
      });
    },
    complete(taskId: string, actualDuration?: number | null): Promise<WorkspaceSnapshot> {
      return request<WorkspaceSnapshot>(
        `/api/tasks/${encodeURIComponent(taskId)}/complete`,
        { method: 'POST', body: { actualDuration: actualDuration ?? null } },
      );
    },
    reopen(taskId: string): Promise<WorkspaceSnapshot> {
      return request<WorkspaceSnapshot>(`/api/tasks/${encodeURIComponent(taskId)}/reopen`, {
        method: 'POST',
      });
    },
    postpone(
      taskId: string,
      input: { newDeadline?: string | null; reason: string },
    ): Promise<WorkspaceSnapshot> {
      return request<WorkspaceSnapshot>(
        `/api/tasks/${encodeURIComponent(taskId)}/postpone`,
        { method: 'POST', body: input },
      );
    },
  },

  goals: {
    create(input: GoalInput): Promise<WorkspaceSnapshot> {
      return request<WorkspaceSnapshot>('/api/goals', { method: 'POST', body: input });
    },
    update(goalId: string, patch: GoalPatch): Promise<WorkspaceSnapshot> {
      return request<WorkspaceSnapshot>(`/api/goals/${encodeURIComponent(goalId)}`, {
        method: 'PATCH',
        body: patch,
      });
    },
    remove(goalId: string): Promise<WorkspaceSnapshot> {
      return request<WorkspaceSnapshot>(`/api/goals/${encodeURIComponent(goalId)}`, {
        method: 'DELETE',
      });
    },
  },

  plans: {
    generate(input: PlanInput): Promise<WorkspaceSnapshot> {
      return request<WorkspaceSnapshot>('/api/plans', { method: 'POST', body: input });
    },
    remove(planId: string): Promise<WorkspaceSnapshot> {
      return request<WorkspaceSnapshot>(`/api/plans/${encodeURIComponent(planId)}`, {
        method: 'DELETE',
      });
    },
    toggleItem(planId: string, itemId: string): Promise<WorkspaceSnapshot> {
      return request<WorkspaceSnapshot>(
        `/api/plans/${encodeURIComponent(planId)}/items/${encodeURIComponent(itemId)}/toggle`,
        { method: 'POST' },
      );
    },
    updateNotes(planId: string, notes: string): Promise<WorkspaceSnapshot> {
      return request<WorkspaceSnapshot>(
        `/api/plans/${encodeURIComponent(planId)}/notes`,
        { method: 'PATCH', body: { notes } },
      );
    },
    accept(planId: string): Promise<WorkspaceSnapshot> {
      return request<WorkspaceSnapshot>(
        `/api/plans/${encodeURIComponent(planId)}/accept`,
        { method: 'POST' },
      );
    },
    updateItem(
      planId: string,
      itemId: string,
      patch: PlanItemPatch,
    ): Promise<WorkspaceSnapshot> {
      return request<WorkspaceSnapshot>(
        `/api/plans/${encodeURIComponent(planId)}/items/${encodeURIComponent(itemId)}`,
        { method: 'PATCH', body: patch },
      );
    },
    moveItem(
      planId: string,
      itemId: string,
      direction: PlanItemMove,
    ): Promise<WorkspaceSnapshot> {
      return request<WorkspaceSnapshot>(
        `/api/plans/${encodeURIComponent(planId)}/items/${encodeURIComponent(itemId)}/move`,
        { method: 'POST', body: { direction } },
      );
    },
  },

  reflections: {
    save(input: ReflectionInput): Promise<WorkspaceSnapshot> {
      return request<WorkspaceSnapshot>('/api/reflections', { method: 'POST', body: input });
    },
    regenerate(reflectionId: string): Promise<WorkspaceSnapshot> {
      return request<WorkspaceSnapshot>(
        `/api/reflections/${encodeURIComponent(reflectionId)}/summary`,
        { method: 'POST' },
      );
    },
    remove(reflectionId: string): Promise<WorkspaceSnapshot> {
      return request<WorkspaceSnapshot>(
        `/api/reflections/${encodeURIComponent(reflectionId)}`,
        { method: 'DELETE' },
      );
    },
    get(reflectionId: string): Promise<Reflection> {
      return request<Reflection>(`/api/reflections/${encodeURIComponent(reflectionId)}`);
    },
  },

  assistant: {
    send(message: string): Promise<WorkspaceSnapshot> {
      return request<WorkspaceSnapshot>('/api/assistant/messages', {
        method: 'POST',
        body: { message },
      });
    },
    clear(): Promise<WorkspaceSnapshot> {
      return request<WorkspaceSnapshot>('/api/assistant/messages', { method: 'DELETE' });
    },
  },

  session: {
    setToken(token: string | null): void {
      writeToken(token);
    },
    getToken(): string | null {
      return readToken();
    },
  },
};

export type StopifyApi = typeof stopifyApi;

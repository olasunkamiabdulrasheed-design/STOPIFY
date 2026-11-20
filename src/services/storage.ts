const memory = new Map<string, string>();

function canUseLocalStorage(): boolean {
  try {
    const key = '__stopify_probe__';
    window.localStorage.setItem(key, '1');
    window.localStorage.removeItem(key);
    return true;
  } catch {
    return false;
  }
}

const persistent = typeof window !== 'undefined' && canUseLocalStorage();

export function readRaw(key: string): string | null {
  if (persistent) {
    try {
      return window.localStorage.getItem(key);
    } catch {
      return memory.get(key) ?? null;
    }
  }
  return memory.get(key) ?? null;
}

export function writeRaw(key: string, value: string): void {
  if (persistent) {
    try {
      window.localStorage.setItem(key, value);
      return;
    } catch {
      /* fall through to memory */
    }
  }
  memory.set(key, value);
}

export function removeRaw(key: string): void {
  if (persistent) {
    try {
      window.localStorage.removeItem(key);
    } catch {
      /* ignore */
    }
  }
  memory.delete(key);
}

export function readJson<T>(key: string, fallback: T): T {
  const raw = readRaw(key);
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function writeJson(key: string, value: unknown): void {
  writeRaw(key, JSON.stringify(value));
}

export const STORAGE_KEYS = {
  accounts: 'stopify.accounts.v1',
  session: 'stopify.session.v1',
  resets: 'stopify.password-resets.v1',
  workspacePrefix: 'stopify.workspace.v1.',
  legacyToken: 'stopify.token',
  legacyWorkspace: 'stopify.workspace.v0',
} as const;

import type { User } from '@/lib/types';
import { readJson, removeRaw, writeJson, STORAGE_KEYS } from './storage';
import type { AuthAccount, DemoResetRequest } from './types';
import { createEmptyWorkspace, loadWorkspace, saveWorkspace } from './workspaceStore';
import { createSampleWorkspace } from './sampleData';

export const DEMO_EMAIL = 'demo@stopify.app';
export const DEMO_PASSWORD = 'stopify-demo';
export const DEMO_NAME = 'Alex Morgan';

export class AuthError extends Error {
  code: string;

  constructor(message: string, code = 'auth_error') {
    super(message);
    this.name = 'AuthError';
    this.code = code;
  }
}

interface Session {
  userId: string;
  signedInAt: string;
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function toUser(account: AuthAccount): User {
  return {
    id: account.id,
    name: account.name,
    email: account.email,
    createdAt: account.createdAt,
  };
}

function readAccounts(): AuthAccount[] {
  const accounts = readJson<AuthAccount[]>(STORAGE_KEYS.accounts, []);
  return Array.isArray(accounts) ? accounts : [];
}

function writeAccounts(accounts: AuthAccount[]): void {
  writeJson(STORAGE_KEYS.accounts, accounts);
}

function getSession(): Session | null {
  return readJson<Session | null>(STORAGE_KEYS.session, null);
}

function setSession(userId: string): void {
  writeJson(STORAGE_KEYS.session, {
    userId,
    signedInAt: new Date().toISOString(),
  } satisfies Session);
}

function clearSession(): void {
  removeRaw(STORAGE_KEYS.session);
}

function randomId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `id-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function randomSalt(): string {
  if (typeof crypto !== 'undefined' && 'getRandomValues' in crypto) {
    const bytes = crypto.getRandomValues(new Uint8Array(16));
    return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
  }
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`;
}

async function hashPassword(password: string, salt: string): Promise<string> {
  const input = `${salt}:${password}`;
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const encoded = new TextEncoder().encode(input);
    const digest = await crypto.subtle.digest('SHA-256', encoded);
    return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
  }
  let hash = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `fallback-${(hash >>> 0).toString(16)}`;
}

function validateEmail(email: string): string {
  const normalized = normalizeEmail(email);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(normalized)) {
    throw new AuthError('Enter a valid email address.', 'invalid_email');
  }
  return normalized;
}

function validatePassword(password: string): string {
  if (password.length < 8) {
    throw new AuthError('Password must be at least 8 characters.', 'weak_password');
  }
  if (password.length > 72) {
    throw new AuthError('Password must be 72 characters or fewer.', 'weak_password');
  }
  return password;
}

export function cleanupLegacyStorage(): void {
  removeRaw(STORAGE_KEYS.legacyToken);
  removeRaw(STORAGE_KEYS.legacyWorkspace);
}

export function getCurrentUser(): User | null {
  cleanupLegacyStorage();
  const session = getSession();
  if (!session) return null;
  const account = readAccounts().find((item) => item.id === session.userId);
  return account ? toUser(account) : null;
}

export async function register(name: string, email: string, password: string): Promise<User> {
  const cleanName = name.trim();
  if (cleanName.length < 2) throw new AuthError('Please enter your full name.', 'invalid_name');
  if (cleanName.length > 80) throw new AuthError('Name is too long.', 'invalid_name');
  const normalizedEmail = validateEmail(email);
  validatePassword(password);

  const accounts = readAccounts();
  if (accounts.some((account) => account.email === normalizedEmail)) {
    throw new AuthError('An account with this email already exists.', 'email_taken');
  }

  const salt = randomSalt();
  const account: AuthAccount = {
    id: randomId(),
    name: cleanName,
    email: normalizedEmail,
    salt,
    passwordHash: await hashPassword(password, salt),
    createdAt: new Date().toISOString(),
  };

  writeAccounts([...accounts, account]);
  const user = toUser(account);
  saveWorkspace(createEmptyWorkspace(user));
  setSession(account.id);
  return user;
}

export async function login(email: string, password: string): Promise<User> {
  const normalizedEmail = validateEmail(email);
  const account = readAccounts().find((item) => item.email === normalizedEmail);
  if (!account) {
    throw new AuthError('Invalid email or password.', 'invalid_credentials');
  }
  const hash = await hashPassword(password, account.salt);
  if (hash !== account.passwordHash) {
    throw new AuthError('Invalid email or password.', 'invalid_credentials');
  }

  if (!loadWorkspace(account.id)) {
    const user = toUser(account);
    saveWorkspace(createEmptyWorkspace(user));
  }

  setSession(account.id);
  return toUser(account);
}

export async function loginDemo(): Promise<User> {
  const accounts = readAccounts();
  let account = accounts.find((item) => item.email === DEMO_EMAIL);

  if (!account) {
    const salt = randomSalt();
    account = {
      id: randomId(),
      name: DEMO_NAME,
      email: DEMO_EMAIL,
      salt,
      passwordHash: await hashPassword(DEMO_PASSWORD, salt),
      createdAt: new Date().toISOString(),
    };
    writeAccounts([...accounts, account]);
  }

  const user = toUser(account);
  if (!loadWorkspace(account.id)) {
    saveWorkspace(createSampleWorkspace(user));
  }

  setSession(account.id);
  return user;
}

export function logout(): void {
  clearSession();
}

export async function updateAccountProfile(
  userId: string,
  updates: { name?: string; email?: string },
): Promise<User> {
  const accounts = readAccounts();
  const index = accounts.findIndex((account) => account.id === userId);
  if (index < 0) throw new AuthError('Account not found.', 'not_found');

  const account = accounts[index];
  const nextName = updates.name !== undefined ? updates.name.trim() : account.name;
  if (nextName.length < 2) throw new AuthError('Name must be at least 2 characters.', 'invalid_name');
  if (nextName.length > 80) throw new AuthError('Name is too long.', 'invalid_name');

  const nextEmail = updates.email !== undefined ? validateEmail(updates.email) : account.email;
  if (nextEmail !== account.email) {
    if (accounts.some((item) => item.email === nextEmail && item.id !== userId)) {
      throw new AuthError('That email is already in use.', 'email_taken');
    }
  }

  const updated: AuthAccount = { ...account, name: nextName, email: nextEmail };
  accounts[index] = updated;
  writeAccounts(accounts);

  const workspace = loadWorkspace(userId);
  if (workspace) {
    workspace.profile = {
      ...workspace.profile,
      name: nextName,
      email: nextEmail,
    };
    saveWorkspace(workspace);
  }

  return toUser(updated);
}

export async function changePassword(
  userId: string,
  currentPassword: string,
  newPassword: string,
): Promise<void> {
  validatePassword(newPassword);
  const accounts = readAccounts();
  const index = accounts.findIndex((account) => account.id === userId);
  if (index < 0) throw new AuthError('Account not found.', 'not_found');

  const account = accounts[index];
  const currentHash = await hashPassword(currentPassword, account.salt);
  if (currentHash !== account.passwordHash) {
    throw new AuthError('Your current password is incorrect.', 'invalid_password');
  }

  const salt = randomSalt();
  accounts[index] = {
    ...account,
    salt,
    passwordHash: await hashPassword(newPassword, salt),
  };
  writeAccounts(accounts);
}

export async function deleteAccount(userId: string, password: string): Promise<void> {
  const accounts = readAccounts();
  const account = accounts.find((item) => item.id === userId);
  if (!account) throw new AuthError('Account not found.', 'not_found');

  const hash = await hashPassword(password, account.salt);
  if (hash !== account.passwordHash) {
    throw new AuthError('Password is incorrect.', 'invalid_password');
  }

  writeAccounts(accounts.filter((item) => item.id !== userId));
  removeRaw(`${STORAGE_KEYS.workspacePrefix}${userId}`);
  clearSession();
}

export async function requestPasswordReset(email: string): Promise<{
  message: string;
  demoResetUrl?: string;
  demoResetToken?: string;
}> {
  const normalizedEmail = validateEmail(email);
  const account = readAccounts().find((item) => item.email === normalizedEmail);
  const message =
    'If a local account exists for that email, a demo reset link has been prepared. It expires after 30 minutes.';

  if (!account) return { message };

  const token = randomId();
  const resets = readJson<DemoResetRequest[]>(STORAGE_KEYS.resets, []);
  const next: DemoResetRequest[] = [
    ...resets.filter((item) => item.email !== normalizedEmail),
    {
      token,
      email: normalizedEmail,
      expiresAt: new Date(Date.now() + 30 * 60_000).toISOString(),
    },
  ];
  writeJson(STORAGE_KEYS.resets, next);

  return {
    message,
    demoResetToken: token,
    demoResetUrl: `${window.location.origin}/reset-password?token=${token}`,
  };
}

export async function resetPassword(token: string, password: string): Promise<void> {
  validatePassword(password);
  const resets = readJson<DemoResetRequest[]>(STORAGE_KEYS.resets, []);
  const request = resets.find((item) => item.token === token);
  if (!request || new Date(request.expiresAt).getTime() < Date.now()) {
    throw new AuthError(
      'This reset link is invalid or has expired. Request a new one.',
      'invalid_reset_token',
    );
  }

  const accounts = readAccounts();
  const index = accounts.findIndex((account) => account.email === request.email);
  if (index < 0) {
    throw new AuthError('The account for this reset link no longer exists.', 'not_found');
  }

  const salt = randomSalt();
  accounts[index] = {
    ...accounts[index],
    salt,
    passwordHash: await hashPassword(password, salt),
  };
  writeAccounts(accounts);
  writeJson(
    STORAGE_KEYS.resets,
    resets.filter((item) => item.token !== token),
  );
}

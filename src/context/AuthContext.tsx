import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { User } from '@/lib/types';
import {
  changePassword,
  deleteAccount,
  getCurrentUser,
  login,
  loginDemo,
  logout,
  register,
  requestPasswordReset,
  resetPassword,
  updateAccountProfile,
} from '@/services/authService';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<User>;
  register: (name: string, email: string, password: string) => Promise<User>;
  loginDemo: () => Promise<User>;
  logout: () => void;
  refreshUser: () => void;
  updateUser: (user: User) => void;
  updateAccount: (updates: { name?: string; email?: string }) => Promise<User>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  deleteAccount: (password: string) => Promise<void>;
  requestPasswordReset: typeof requestPasswordReset;
  resetPassword: typeof resetPassword;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = useCallback(() => {
    setUser(getCurrentUser());
    setLoading(false);
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const signIn = useCallback(async (email: string, password: string) => {
    const next = await login(email, password);
    setUser(next);
    return next;
  }, []);

  const signUp = useCallback(async (name: string, email: string, password: string) => {
    const next = await register(name, email, password);
    setUser(next);
    return next;
  }, []);

  const signInDemo = useCallback(async () => {
    const next = await loginDemo();
    setUser(next);
    return next;
  }, []);

  const signOut = useCallback(() => {
    logout();
    setUser(null);
  }, []);

  const updateUser = useCallback((next: User) => {
    setUser(next);
  }, []);

  const updateAccount = useCallback(
    async (updates: { name?: string; email?: string }) => {
      if (!user) throw new Error('You need to be signed in.');
      const next = await updateAccountProfile(user.id, updates);
      setUser(next);
      return next;
    },
    [user],
  );

  const updatePassword = useCallback(
    async (currentPassword: string, newPassword: string) => {
      if (!user) throw new Error('You need to be signed in.');
      await changePassword(user.id, currentPassword, newPassword);
    },
    [user],
  );

  const removeAccount = useCallback(
    async (password: string) => {
      if (!user) throw new Error('You need to be signed in.');
      await deleteAccount(user.id, password);
      setUser(null);
    },
    [user],
  );

  const value = useMemo(
    () => ({
      user,
      loading,
      login: signIn,
      register: signUp,
      loginDemo: signInDemo,
      logout: signOut,
      refreshUser,
      updateUser,
      updateAccount,
      changePassword: updatePassword,
      deleteAccount: removeAccount,
      requestPasswordReset,
      resetPassword,
    }),
    [
      user,
      loading,
      signIn,
      signUp,
      signInDemo,
      signOut,
      refreshUser,
      updateUser,
      updateAccount,
      updatePassword,
      removeAccount,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}

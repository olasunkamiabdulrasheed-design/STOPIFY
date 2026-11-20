import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  BadgeCheck,
  Check,
  Database,
  Download,
  HardDrive,
  KeyRound,
  Lock,
  Mail,
  Palette,
  RefreshCw,
  Shield,
  Sparkles,
  Trash2,
  Trophy,
  UploadCloud,
  UserRound,
  Volume2,
} from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Field, Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Modal } from '@/components/ui/Modal';
import { Progress } from '@/components/ui/Progress';
import { AchievementIcon } from '@/components/ui/AchievementIcon';
import { PageSkeleton, ErrorState } from '@/components/ui/Loading';
import { useAuth } from '@/context/AuthContext';
import { useWorkspace } from '@/context/WorkspaceContext';
import { DEMO_EMAIL } from '@/services/authService';
import { toastError } from '@/lib/toast';
import { cn } from '@/lib/utils';
import type { Preferences } from '@/lib/types';

type Tab = 'profile' | 'preferences' | 'achievements' | 'data';

const tabs: { id: Tab; label: string; icon: typeof UserRound }[] = [
  { id: 'profile', label: 'Profile & account', icon: UserRound },
  { id: 'preferences', label: 'Preferences', icon: Palette },
  { id: 'achievements', label: 'Achievements', icon: Trophy },
  { id: 'data', label: 'Data & privacy', icon: Database },
];

const tierTone = {
  starter: 'sky',
  consistency: 'amber',
  recovery: 'rose',
  planning: 'violet',
} as const;

export function SettingsPage() {
  const { user, updateAccount, changePassword, deleteAccount } = useAuth();
  const { snapshot, loading, error, actions } = useWorkspace();
  const location = useLocation();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>('profile');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [passwords, setPasswords] = useState({ current: '', next: '', confirm: '' });
  const [savingPassword, setSavingPassword] = useState(false);
  const [preferences, setPreferences] = useState<Preferences | null>(null);
  const [savingPreferences, setSavingPreferences] = useState(false);
  const [confirmAction, setConfirmAction] = useState<'sample' | 'clear' | null>(null);
  const [confirmBusy, setConfirmBusy] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [exporting, setExporting] = useState(false);

  const isDemo = user?.email === DEMO_EMAIL;

  useEffect(() => {
    if (user) {
      setName(user.name);
      setEmail(user.email);
    }
  }, [user]);

  useEffect(() => {
    if (snapshot) {
      setPreferences(snapshot.preferences);
    }
  }, [snapshot]);

  useEffect(() => {
    if (location.hash === '#demo') {
      setTab('profile');
      const timer = window.setTimeout(() => {
        document.getElementById('demo-account')?.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
        });
      }, 80);
      return () => window.clearTimeout(timer);
    }
  }, [location.hash]);

  const dataSize = useMemo(() => {
    if (!snapshot) return '0 KB';
    try {
      const bytes = new Blob([JSON.stringify(actions.exportWorkspace())]).size;
      return bytes < 1024 ? `${bytes} B` : `${Math.round(bytes / 1024)} KB`;
    } catch {
      return '—';
    }
  }, [snapshot, actions]);

  if (loading) return <PageSkeleton />;
  if (error || !snapshot || !user) {
    return <ErrorState message={error ?? 'Could not load settings.'} />;
  }

  const achievements = snapshot.achievements;
  const tierGroups = ['starter', 'consistency', 'recovery', 'planning'] as const;

  async function saveProfile(event: FormEvent) {
    event.preventDefault();
    const trimmedName = name.trim();
    const trimmedEmail = email.trim().toLowerCase();
    if (trimmedName.length < 2) {
      toast.error('Name must be at least 2 characters.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      toast.error('Enter a valid email address.');
      return;
    }
    setSavingProfile(true);
    try {
      await updateAccount({ name: trimmedName, email: trimmedEmail });
      await actions.updateWorkspaceProfile({ name: trimmedName, email: trimmedEmail });
      toast.success('Profile updated.');
    } catch (caught) {
      toastError(caught);
    } finally {
      setSavingProfile(false);
    }
  }

  async function savePassword(event: FormEvent) {
    event.preventDefault();
    if (passwords.next.length < 8) {
      toast.error('New password must be at least 8 characters.');
      return;
    }
    if (passwords.next !== passwords.confirm) {
      toast.error('New passwords do not match.');
      return;
    }
    setSavingPassword(true);
    try {
      await changePassword(passwords.current, passwords.next);
      setPasswords({ current: '', next: '', confirm: '' });
      toast.success('Password changed.');
    } catch (caught) {
      toastError(caught);
    } finally {
      setSavingPassword(false);
    }
  }

  async function savePreferences(event: FormEvent) {
    event.preventDefault();
    if (!preferences) return;
    setSavingPreferences(true);
    try {
      await actions.updatePreferences(preferences);
      toast.success('Preferences saved.');
    } catch (caught) {
      toastError(caught);
    } finally {
      setSavingPreferences(false);
    }
  }

  async function runConfirm() {
    if (!confirmAction) return;
    setConfirmBusy(true);
    try {
      if (confirmAction === 'sample') {
        await actions.loadSampleWorkspace();
        toast.success('Sample workspace loaded.');
      } else {
        await actions.clearWorkspace();
        toast.success('Workspace cleared. Your account and preferences remain.');
      }
      setConfirmAction(null);
    } catch (caught) {
      toastError(caught);
    } finally {
      setConfirmBusy(false);
    }
  }

  async function removeAccount(event: FormEvent) {
    event.preventDefault();
    if (!deletePassword) {
      toast.error('Enter your password to continue.');
      return;
    }
    setDeleting(true);
    try {
      await deleteAccount(deletePassword);
      toast.success('Account deleted.');
      setDeleteOpen(false);
      navigate('/');
    } catch (caught) {
      toastError(caught);
    } finally {
      setDeleting(false);
    }
  }

  function exportData() {
    setExporting(true);
    try {
      const data = actions.exportWorkspace();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `stopify-workspace-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
      toast.success('Workspace exported as JSON.');
    } catch (caught) {
      toastError(caught);
    } finally {
      setExporting(false);
    }
  }

  function updatePreference<K extends keyof Preferences>(key: K, value: Preferences[K]) {
    if (!preferences) return;
    setPreferences({ ...preferences, [key]: value });
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        eyebrow="Your system"
        title="Settings"
        description="Identity, planning defaults, earned milestones and the data stored in this browser."
      />

      <div role="tablist" aria-label="Settings sections" className="flex flex-wrap gap-1.5">
        {tabs.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={tab === item.id}
              onClick={() => setTab(item.id)}
              className={cn(
                'inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-medium transition',
                tab === item.id
                  ? 'border-accent-400/30 bg-accent-500/10 text-accent-200'
                  : 'border-white/[0.07] bg-white/[0.02] text-slate-400 hover:border-white/[0.12] hover:text-slate-200',
              )}
            >
              <Icon className="h-3.5 w-3.5" aria-hidden />
              {item.label}
            </button>
          );
        })}
      </div>

      {tab === 'profile' ? (
        <div className="grid items-start gap-4 lg:grid-cols-2">
          <Card className="p-5 sm:p-6">
            <div className="flex items-center gap-3">
              <Avatar name={user.name} size="lg" />
              <div className="min-w-0">
                <h2 className="font-display text-base font-semibold text-slate-100">{user.name}</h2>
                <p className="truncate text-xs text-slate-500">{user.email}</p>
                <p className="mt-1 text-[10px] text-slate-600">
                  Local account · created {new Date(user.createdAt).toLocaleDateString()}
                </p>
              </div>
            </div>

            <form onSubmit={saveProfile} className="mt-5 space-y-4">
              <Field label="Display name" htmlFor="profile-name" required>
                <Input
                  id="profile-name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  minLength={2}
                  maxLength={80}
                  required
                />
              </Field>
              <Field
                label="Email"
                htmlFor="profile-email"
                required
                hint={
                  isDemo
                    ? 'The demo account keeps a fixed email so one-click sign-in always works.'
                    : 'Used only as your local sign-in identifier in this browser.'
                }
              >
                <Input
                  id="profile-email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  disabled={isDemo}
                  required
                />
              </Field>
              <div className="flex items-center gap-2">
                <Button type="submit" loading={savingProfile} icon={<Check className="h-4 w-4" />}>
                  Save profile
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setName(user.name);
                    setEmail(user.email);
                  }}
                >
                  Reset
                </Button>
              </div>
            </form>
          </Card>

          <div className="space-y-4">
            <Card className="p-5 sm:p-6">
              <h2 className="flex items-center gap-2 font-display text-base font-semibold text-slate-100">
                <KeyRound className="h-4 w-4 text-accent-300" aria-hidden />
                Change password
              </h2>
              <p className="mt-1 text-xs leading-relaxed text-slate-400">
                Passwords are salted and hashed before being stored in localStorage. This is demo-grade
                local auth, not production security.
              </p>
              <form onSubmit={savePassword} className="mt-4 space-y-3">
                <Field label="Current password" htmlFor="current-password">
                  <Input
                    id="current-password"
                    type="password"
                    value={passwords.current}
                    onChange={(event) =>
                      setPasswords((previous) => ({ ...previous, current: event.target.value }))
                    }
                    autoComplete="current-password"
                    required
                  />
                </Field>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="New password" htmlFor="new-password">
                    <Input
                      id="new-password"
                      type="password"
                      value={passwords.next}
                      onChange={(event) =>
                        setPasswords((previous) => ({ ...previous, next: event.target.value }))
                      }
                      autoComplete="new-password"
                      minLength={8}
                      required
                    />
                  </Field>
                  <Field label="Confirm new password" htmlFor="confirm-password">
                    <Input
                      id="confirm-password"
                      type="password"
                      value={passwords.confirm}
                      onChange={(event) =>
                        setPasswords((previous) => ({ ...previous, confirm: event.target.value }))
                      }
                      autoComplete="new-password"
                      minLength={8}
                      required
                    />
                  </Field>
                </div>
                <Button
                  type="submit"
                  variant="secondary"
                  loading={savingPassword}
                  disabled={!passwords.current || passwords.next.length < 8}
                >
                  Update password
                </Button>
              </form>
            </Card>

            <Card
              id="demo-account"
              className={cn(
                'p-5 sm:p-6',
                isDemo && 'border-amber-500/25 bg-amber-500/[0.04]',
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <h2 className="flex items-center gap-2 font-display text-sm font-semibold text-slate-100">
                  <Sparkles className="h-4 w-4 text-accent-300" aria-hidden />
                  {isDemo ? 'Demo account' : 'Account mode'}
                </h2>
                <Badge tone={isDemo ? 'amber' : 'emerald'}>
                  {isDemo ? 'Demo' : 'Local'}
                </Badge>
              </div>
              <p className="mt-2 text-[11px] leading-relaxed text-slate-400">
                {isDemo
                  ? 'You are signed in to the shared demonstration account. Sample data is clearly labelled and can be cleared from Settings → Data & privacy.'
                  : 'This account exists only in this browser. No server, analytics or email service is connected.'}
              </p>
              <div className="mt-3 space-y-1.5 rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2.5 text-[10px] text-slate-500">
                <p className="flex items-center gap-2">
                  <Shield className="h-3 w-3" aria-hidden /> Local password hash, never plaintext
                </p>
                <p className="flex items-center gap-2">
                  <HardDrive className="h-3 w-3" aria-hidden /> Workspace stored under your account key
                </p>
                <p className="flex items-center gap-2">
                  <Sparkles className="h-3 w-3" aria-hidden /> All AI-related features are simulated
                </p>
              </div>
            </Card>
          </div>
        </div>
      ) : null}

      {tab === 'preferences' && preferences ? (
        <form onSubmit={savePreferences} className="grid items-start gap-4 lg:grid-cols-[1.2fr_1fr]">
          <Card className="space-y-5 p-5 sm:p-6">
            <div>
              <h2 className="font-display text-base font-semibold text-slate-100">
                Planning defaults
              </h2>
              <p className="mt-1 text-xs text-slate-400">
                The planner and recommendations use these boundaries.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Focus window starts" htmlFor="focus-start" required>
                <Input
                  id="focus-start"
                  type="time"
                  value={preferences.focusStart}
                  onChange={(event) => updatePreference('focusStart', event.target.value)}
                  required
                />
              </Field>
              <Field label="Focus window ends" htmlFor="focus-end" required>
                <Input
                  id="focus-end"
                  type="time"
                  value={preferences.focusEnd}
                  onChange={(event) => updatePreference('focusEnd', event.target.value)}
                  required
                />
              </Field>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="Daily completion target"
                htmlFor="daily-target"
                hint="Used in recommendations and streak context (1–12)."
              >
                <Input
                  id="daily-target"
                  type="number"
                  min={1}
                  max={12}
                  value={preferences.dailyTarget}
                  onChange={(event) => updatePreference('dailyTarget', Number(event.target.value))}
                />
              </Field>
              <Field
                label="Default plan capacity"
                htmlFor="plan-capacity"
                hint="Minutes available when you open the planner (30–720)."
              >
                <Input
                  id="plan-capacity"
                  type="number"
                  min={30}
                  max={720}
                  step={15}
                  value={preferences.defaultPlanMinutes}
                  onChange={(event) =>
                    updatePreference('defaultPlanMinutes', Number(event.target.value))
                  }
                />
              </Field>
            </div>

            <div className="space-y-2 border-t border-white/[0.07] pt-4">
              <h3 className="flex items-center gap-2 text-xs font-semibold text-slate-200">
                <Volume2 className="h-3.5 w-3.5 text-slate-400" aria-hidden />
                Notifications
              </h3>
              <p className="text-[10px] leading-relaxed text-slate-500">
                These preferences are stored, but this demo sends no email and no push notifications.
              </p>
              <label className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-white/[0.07] bg-white/[0.02] px-3.5 py-3">
                <span className="text-[11px] text-slate-300">Email reminders (not sent in demo)</span>
                <input
                  type="checkbox"
                  checked={preferences.notifications.email}
                  onChange={(event) =>
                    updatePreference('notifications', {
                      ...preferences.notifications,
                      email: event.target.checked,
                    })
                  }
                  className="h-4 w-4 accent-violet-500"
                />
              </label>
              <label className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-white/[0.07] bg-white/[0.02] px-3.5 py-3">
                <span className="text-[11px] text-slate-300">Weekly review digest (not sent)</span>
                <input
                  type="checkbox"
                  checked={preferences.notifications.weekly}
                  onChange={(event) =>
                    updatePreference('notifications', {
                      ...preferences.notifications,
                      weekly: event.target.checked,
                    })
                  }
                  className="h-4 w-4 accent-violet-500"
                />
              </label>
            </div>

            <div className="flex items-center gap-2 border-t border-white/[0.07] pt-4">
              <Button type="submit" loading={savingPreferences} icon={<Check className="h-4 w-4" />}>
                Save preferences
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setPreferences(snapshot.preferences)}
              >
                Reset
              </Button>
            </div>
          </Card>

          <div className="space-y-4">
            <Card className="p-5">
              <h2 className="font-display text-sm font-semibold text-slate-100">How defaults apply</h2>
              <ul className="mt-3 space-y-2.5 text-[11px] leading-relaxed text-slate-400">
                <li className="flex gap-2">
                  <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-accent-400" />
                  The planner never schedules focus blocks outside your focus window.
                </li>
                <li className="flex gap-2">
                  <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-accent-400" />
                  Default capacity pre-fills the planner’s available minutes.
                </li>
                <li className="flex gap-2">
                  <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-accent-400" />
                  Daily target influences the tone of dashboard guidance, not your score.
                </li>
                <li className="flex gap-2">
                  <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-accent-400" />
                  Every simulated AI surface reads these same preferences from the workspace.
                </li>
              </ul>
            </Card>
            <div className="rounded-2xl border border-sky-500/20 bg-sky-500/[0.05] p-4">
              <p className="flex items-center gap-2 text-xs font-semibold text-sky-200">
                <Mail className="h-3.5 w-3.5" aria-hidden />
                No outbound messaging
              </p>
              <p className="mt-1.5 text-[10px] leading-relaxed text-sky-200/70">
                Enabling these toggles changes only your saved preferences. Nothing is emailed,
                queued or shared.
              </p>
            </div>
          </div>
        </form>
      ) : null}

      {tab === 'achievements' ? (
        <div className="space-y-4">
          <Card className="flex flex-wrap items-center justify-between gap-4 p-5 sm:p-6">
            <div className="flex items-center gap-4">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-amber-400/25 bg-amber-500/10 text-amber-300">
                <Trophy className="h-5 w-5" aria-hidden />
              </span>
              <div>
                <h2 className="font-display text-lg font-semibold text-slate-100">
                  {snapshot.achievementState.earnedCount} of{' '}
                  {snapshot.achievementState.totalCount} earned
                </h2>
                <p className="mt-0.5 text-xs text-slate-400">
                  Milestones are recomputed from your task, planning and reflection records.
                </p>
              </div>
            </div>
            <div className="w-full max-w-xs">
              <Progress
                value={
                  (snapshot.achievementState.earnedCount /
                    Math.max(1, snapshot.achievementState.totalCount)) *
                  100
                }
                label="Achievements earned"
                barClassName="bg-amber-400"
              />
            </div>
          </Card>

          {tierGroups.map((tier) => {
            const items = achievements.filter((achievement) => achievement.tier === tier);
            if (items.length === 0) return null;
            return (
              <div key={tier}>
                <div className="mb-2 flex items-center gap-2">
                  <h3 className="font-display text-sm font-semibold capitalize text-slate-200">
                    {tier}
                  </h3>
                  <Badge tone={tierTone[tier]}>
                    {items.filter((item) => item.earned).length}/{items.length}
                  </Badge>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {items.map((achievement) => (
                    <div
                      key={achievement.type}
                      className={cn(
                        'surface flex gap-3 p-4',
                        achievement.earned
                          ? 'border-amber-400/20 bg-amber-500/[0.04]'
                          : 'opacity-80',
                      )}
                    >
                      <span
                        className={cn(
                          'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border',
                          achievement.earned
                            ? 'border-amber-400/30 bg-amber-500/10 text-amber-300'
                            : 'border-white/[0.08] bg-white/[0.03] text-slate-500',
                        )}
                      >
                        {achievement.earned ? (
                          <AchievementIcon name={achievement.icon} className="h-5 w-5" />
                        ) : (
                          <Lock className="h-4 w-4" aria-hidden />
                        )}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-xs font-semibold text-slate-200">{achievement.title}</p>
                          {achievement.earned ? (
                            <BadgeCheck className="h-3.5 w-3.5 shrink-0 text-amber-300" aria-hidden />
                          ) : null}
                        </div>
                        <p className="mt-0.5 text-[10px] leading-relaxed text-slate-500">
                          {achievement.description}
                        </p>
                        <div className="mt-2">
                          <Progress
                            value={
                              (achievement.progress.current /
                                Math.max(1, achievement.progress.target)) *
                              100
                            }
                            barClassName={achievement.earned ? 'bg-amber-400' : 'bg-slate-500'}
                            label={achievement.title}
                          />
                          <p className="mt-1 text-[9px] text-slate-600">
                            {achievement.earned
                              ? `Earned ${achievement.earnedAt ? new Date(achievement.earnedAt).toLocaleDateString() : ''}`
                              : `${achievement.progress.current}/${achievement.progress.target} toward unlock`}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : null}

      {tab === 'data' ? (
        <div className="grid items-start gap-4 lg:grid-cols-[1.2fr_1fr]">
          <div className="space-y-4">
            <Card className="p-5 sm:p-6">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h2 className="flex items-center gap-2 font-display text-base font-semibold text-slate-100">
                    <HardDrive className="h-4 w-4 text-accent-300" aria-hidden />
                    Your local workspace
                  </h2>
                  <p className="mt-1 text-xs leading-relaxed text-slate-400">
                    Tasks, goals, plans, reflections and achievements live in this browser’s
                    localStorage under your account. Clearing browser data deletes them.
                  </p>
                </div>
                <Badge tone="emerald">LocalStorage</Badge>
              </div>

              <div className="mt-4 grid gap-2 sm:grid-cols-3">
                <DataStat label="Workspace size" value={dataSize} />
                <DataStat label="Tasks" value={String(snapshot.tasks.length)} />
                <DataStat label="Reflections" value={String(snapshot.reflections.length)} />
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <Button
                  variant="secondary"
                  onClick={exportData}
                  loading={exporting}
                  icon={<Download className="h-4 w-4" />}
                >
                  Export JSON
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => setConfirmAction('sample')}
                  icon={<RefreshCw className="h-4 w-4" />}
                >
                  Load sample workspace
                </Button>
              </div>
              <p className="mt-2 text-[10px] leading-relaxed text-slate-500">
                Exports are plain JSON. Treat them as personal data — reflections may contain
                sensitive notes.
              </p>
            </Card>

            <Card className="border-rose-500/20 p-5 sm:p-6">
              <div className="flex items-start gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-rose-500/25 bg-rose-500/10 text-rose-300">
                  <AlertTriangle className="h-4 w-4" aria-hidden />
                </span>
                <div className="min-w-0 flex-1">
                  <h2 className="font-display text-base font-semibold text-slate-100">
                    Clear workspace
                  </h2>
                  <p className="mt-1 text-xs leading-relaxed text-slate-400">
                    Remove every task, goal, plan, reflection, conversation and earned achievement
                    from this account. Your login and preferences stay.
                  </p>
                  <Button
                    variant="danger"
                    className="mt-3"
                    onClick={() => setConfirmAction('clear')}
                    icon={<Trash2 className="h-4 w-4" />}
                  >
                    Clear all workspace data
                  </Button>
                </div>
              </div>
            </Card>

            <Card className="border-rose-500/25 p-5 sm:p-6">
              <div className="flex items-start gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-rose-500/25 bg-rose-500/10 text-rose-300">
                  <Lock className="h-4 w-4" aria-hidden />
                </span>
                <div className="min-w-0 flex-1">
                  <h2 className="font-display text-base font-semibold text-slate-100">
                    Delete account
                  </h2>
                  <p className="mt-1 text-xs leading-relaxed text-slate-400">
                    Permanently deletes this local account, its password hash and its workspace. This
                    cannot be undone.
                  </p>
                  <Button
                    variant="danger"
                    className="mt-3"
                    onClick={() => setDeleteOpen(true)}
                    icon={<Trash2 className="h-4 w-4" />}
                  >
                    Delete my account
                  </Button>
                </div>
              </div>
            </Card>
          </div>

          <div className="space-y-4">
            <Card className="p-5">
              <h2 className="flex items-center gap-2 font-display text-sm font-semibold text-slate-100">
                <Shield className="h-4 w-4 text-slate-400" aria-hidden />
                Privacy model
              </h2>
              <ul className="mt-3 space-y-2.5 text-[11px] leading-relaxed text-slate-400">
                <li className="flex gap-2">
                  <UploadCloud className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-600" aria-hidden />
                  Nothing is uploaded. There is no telemetry, analytics SDK or remote database.
                </li>
                <li className="flex gap-2">
                  <Shield className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-600" aria-hidden />
                  All AI features are simulations. No prompts or workspace data reach a model provider.
                </li>
                <li className="flex gap-2">
                  <Database className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-600" aria-hidden />
                  Any script on this origin could read localStorage. This is a demo, not a vault.
                </li>
              </ul>
            </Card>

            <Card className="p-5">
              <h2 className="font-display text-sm font-semibold text-slate-100">Backend-ready contract</h2>
              <p className="mt-1 text-[11px] leading-relaxed text-slate-400">
                The UI talks to typed workspace actions with the same shapes a real API would expose.
                Set <span className="font-mono text-slate-300">VITE_DATA_MODE=http</span> to switch the
                workspace adapter without touching a single page.
              </p>
              <div className="mt-3 space-y-2 rounded-xl border border-white/[0.06] bg-[#0d0d14] p-3 font-mono text-[10px] text-slate-500">
                <p>
                  <span className="text-accent-300">VITE_DATA_MODE</span>=local | http
                </p>
                <p>
                  <span className="text-accent-300">VITE_API_BASE_URL</span>=
                  http://localhost:8787
                </p>
              </div>
              <p className="mt-2 text-[10px] leading-relaxed text-slate-600">
                See the README and docs/BACKEND_INTEGRATION.md for every expected endpoint.
              </p>
            </Card>

            <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] px-4 py-3">
              <p className="flex items-center gap-2 text-[11px] text-slate-400">
                <Sparkles className="h-3.5 w-3.5 text-accent-300" aria-hidden />
                STOPIFY · STEM2Connect AI Hackathon demo
              </p>
            </div>
          </div>
        </div>
      ) : null}

      <ConfirmDialog
        open={confirmAction !== null}
        onClose={() => {
          if (!confirmBusy) setConfirmAction(null);
        }}
        onConfirm={runConfirm}
        loading={confirmBusy}
        destructive={confirmAction === 'clear'}
        title={confirmAction === 'sample' ? 'Replace with sample workspace?' : 'Clear workspace?'}
        description={
          confirmAction === 'sample'
            ? 'This replaces your current tasks, goals, plans, reflections and conversation with the demo dataset. Your account and preferences stay. Export first if you want a copy.'
            : 'All tasks, goals, plans, reflections, conversation and achievement history will be removed. Your account and preferences stay. This cannot be undone.'
        }
        confirmLabel={confirmAction === 'sample' ? 'Load sample data' : 'Clear workspace'}
      />

      <Modal
        open={deleteOpen}
        onClose={() => {
          if (!deleting) setDeleteOpen(false);
        }}
        title="Delete account"
        description="This permanently removes the local account and its workspace."
        size="sm"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setDeleteOpen(false)} disabled={deleting}>
              Cancel
            </Button>
            <Button
              variant="danger"
              loading={deleting}
              onClick={(event) => {
                event.preventDefault();
                const form = document.getElementById('delete-account-form');
                if (form instanceof HTMLFormElement) {
                  form.requestSubmit();
                }
              }}
            >
              Delete account
            </Button>
          </div>
        }
      >
        <form id="delete-account-form" onSubmit={removeAccount} className="space-y-3">
          <div className="rounded-xl border border-rose-500/20 bg-rose-500/[0.05] px-3.5 py-3 text-[11px] leading-relaxed text-rose-200/80">
            This action is immediate and cannot be recovered from inside the app. Export your
            workspace first if you need it.
          </div>
          <Field label="Enter your password to confirm" htmlFor="delete-password" required>
            <Input
              id="delete-password"
              type="password"
              value={deletePassword}
              onChange={(event) => setDeletePassword(event.target.value)}
              autoComplete="current-password"
              required
            />
          </Field>
        </form>
      </Modal>
    </div>
  );
}

function DataStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-3.5 py-2.5">
      <p className="text-[9px] uppercase tracking-wider text-slate-500">{label}</p>
      <p className="mt-0.5 text-sm font-medium tabular-nums text-slate-200">{value}</p>
    </div>
  );
}

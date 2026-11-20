import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  BarChart3,
  Bot,
  CalendarClock,
  CheckSquare,
  ChevronRight,
  FlaskConical,
  LayoutDashboard,
  LogOut,
  Menu,
  NotebookPen,
  Settings,
  Sparkles,
  Target,
  TrendingDown,
  X,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useWorkspace } from '@/context/WorkspaceContext';
import { Avatar } from '@/components/ui/Avatar';
import { Logo } from '@/components/ui/Logo';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { errorMessage } from '@/lib/toast';
import { cn } from '@/lib/utils';

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/tasks', label: 'My Tasks', icon: CheckSquare },
  { to: '/goals', label: 'Goals', icon: Target },
  { to: '/planner', label: 'Daily Planner', icon: CalendarClock },
  { to: '/insights', label: 'Procrastination', icon: TrendingDown },
  { to: '/assistant', label: 'AI Assistant', icon: Bot },
  { to: '/analytics', label: 'Analytics', icon: BarChart3 },
  { to: '/reflection', label: 'Daily Reflection', icon: NotebookPen },
  { to: '/settings', label: 'Settings', icon: Settings },
];

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center px-5">
        <Logo asLink={false} />
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-3" aria-label="Main navigation">
        <p className="px-3 pb-2 pt-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-600">
          Workspace
        </p>
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={onNavigate}
              className={({ isActive }) => cn('nav-item group', isActive && 'nav-item-active')}
            >
              {({ isActive }) => (
                <>
                  <Icon
                    className={cn(
                      'h-[18px] w-[18px] shrink-0 transition-colors',
                      isActive ? 'text-accent-300' : 'text-slate-500 group-hover:text-slate-300',
                    )}
                    aria-hidden
                  />
                  <span className="truncate">{item.label}</span>
                  {isActive ? (
                    <ChevronRight className="ml-auto h-3.5 w-3.5 text-accent-300/70" aria-hidden />
                  ) : null}
                </>
              )}
            </NavLink>
          );
        })}
      </nav>

      <div className="space-y-3 border-t border-white/[0.06] px-3 py-4">
        <button
          type="button"
          onClick={() => {
            navigate('/settings#demo');
            onNavigate?.();
          }}
          className="flex w-full items-center gap-2.5 rounded-xl border border-accent-400/20 bg-accent-500/[0.06] px-3 py-2.5 text-left transition hover:bg-accent-500/[0.1]"
        >
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-accent-500/15 text-accent-300">
            <Sparkles className="h-3.5 w-3.5" aria-hidden />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[11px] font-medium text-slate-200">Simulated AI</span>
            <span className="block truncate text-[10px] text-slate-500">
              Frontend demo · no provider connected
            </span>
          </span>
        </button>

        <div className="flex items-center gap-2.5 rounded-xl border border-white/[0.06] bg-white/[0.025] p-2.5">
          <Avatar name={user?.name ?? 'STOPIFY'} size="md" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-medium text-slate-200">{user?.name}</p>
            <p className="truncate text-[10px] text-slate-500">{user?.email}</p>
          </div>
          <button
            type="button"
            onClick={() => {
              logout();
              navigate('/');
            }}
            className="rounded-lg p-1.5 text-slate-500 transition hover:bg-white/[0.07] hover:text-slate-200"
            aria-label="Log out"
            title="Log out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

function SampleWorkspaceBanner() {
  const { snapshot, actions } = useWorkspace();
  const [open, setOpen] = useState(false);
  const [clearing, setClearing] = useState(false);

  if (!snapshot?.isSampleData) return null;

  return (
    <>
      <div className="mb-5 flex flex-col gap-3 rounded-2xl border border-amber-500/25 bg-amber-500/[0.07] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-amber-400/25 bg-amber-500/10 text-amber-300">
            <FlaskConical className="h-3.5 w-3.5" aria-hidden />
          </span>
          <div>
            <p className="text-xs font-semibold text-amber-100">Sample workspace</p>
            <p className="mt-0.5 text-[11px] leading-relaxed text-amber-200/70">
              These tasks, goals and statistics are preloaded demo data — not your real activity.
              Edit them freely, or start clean.
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="shrink-0 border-amber-400/30 text-amber-100 hover:bg-amber-500/10"
          onClick={() => setOpen(true)}
        >
          Clear sample data
        </Button>
      </div>

      <ConfirmDialog
        open={open}
        onClose={() => setOpen(false)}
        loading={clearing}
        destructive
        title="Clear sample workspace?"
        description="This removes the demo tasks, goals, plans, reflections and conversation from this browser. Your account and preferences stay. This cannot be undone."
        confirmLabel="Clear sample data"
        onConfirm={async () => {
          setClearing(true);
          try {
            await actions.clearWorkspace();
            setOpen(false);
          } catch (caught) {
            alert(errorMessage(caught));
          } finally {
            setClearing(false);
          }
        }}
      />
    </>
  );
}

export function AppShell() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileOpen]);

  return (
    <div className="min-h-screen bg-ink-900">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[268px] border-r border-white/[0.06] bg-ink-950/60 backdrop-blur-xl lg:flex lg:flex-col">
        <SidebarContent />
      </aside>

      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-white/[0.06] bg-ink-950/80 px-4 backdrop-blur-xl lg:hidden">
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          className="rounded-lg p-2 text-slate-300 hover:bg-white/[0.07]"
          aria-label="Open navigation"
        >
          <Menu className="h-5 w-5" />
        </button>
        <Logo size="sm" />
        <button
          type="button"
          onClick={() => navigate('/settings')}
          aria-label="Open settings"
        >
          <Avatar name={user?.name ?? 'STOPIFY'} size="sm" />
        </button>
      </header>

      {mobileOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-ink-950/80 backdrop-blur-sm animate-fade-in"
            onClick={() => setMobileOpen(false)}
            aria-hidden
          />
          <div className="absolute inset-y-0 left-0 w-[290px] border-r border-white/[0.08] bg-ink-950 shadow-2xl animate-slide-up">
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              className="absolute right-3 top-4 rounded-lg p-2 text-slate-400 hover:bg-white/[0.07] hover:text-slate-100"
              aria-label="Close navigation"
            >
              <X className="h-4 w-4" />
            </button>
            <SidebarContent onNavigate={() => setMobileOpen(false)} />
          </div>
        </div>
      ) : null}

      <main className="lg:pl-[268px]">
        <div className="mx-auto w-full max-w-[1440px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <SampleWorkspaceBanner />
          <Outlet />
        </div>
      </main>
    </div>
  );
}

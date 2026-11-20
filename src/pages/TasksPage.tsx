import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  CalendarClock,
  CheckCircle2,
  Clock,
  Filter,
  History,
  Plus,
  Search,
  Target,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button, buttonStyles } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input, Select } from '@/components/ui/Input';
import { Badge, PriorityBadge, StatusBadge } from '@/components/ui/Badge';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageSkeleton, ErrorState } from '@/components/ui/Loading';
import { TaskFormModal, CompleteTaskModal, PostponeModal } from '@/components/tasks/TaskModals';
import { TaskDetailModal } from '@/components/tasks/TaskDetailModal';
import { useWorkspace } from '@/context/WorkspaceContext';
import { deadlineInfo, formatDateTime, formatMinutes } from '@/lib/utils';
import type { Priority, Task, TaskStatus } from '@/lib/types';
import { toastError } from '@/lib/toast';

type StatusFilter = 'all' | TaskStatus | 'open' | 'completed';

const statusFilters: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'open', label: 'Open' },
  { value: 'overdue', label: 'Overdue' },
  { value: 'postponed', label: 'Postponed' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'completed', label: 'Completed' },
];

const sortOptions = [
  { value: 'deadline', label: 'Nearest deadline' },
  { value: 'created', label: 'Newest first' },
  { value: 'priority', label: 'Priority' },
  { value: 'delay', label: 'Most delayed' },
];

const priorityOrder: Record<Priority, number> = { critical: 4, high: 3, medium: 2, low: 1 };

export function TasksPage() {
  const { snapshot, loading, error, actions } = useWorkspace();
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<StatusFilter>('open');
  const [priority, setPriority] = useState<'all' | Priority>('all');
  const [category, setCategory] = useState('all');
  const [sort, setSort] = useState('deadline');

  const [formOpen, setFormOpen] = useState(false);
  const [formTask, setFormTask] = useState<Task | null>(null);
  const [detailTask, setDetailTask] = useState<Task | null>(null);
  const [completeTask, setCompleteTask] = useState<Task | null>(null);
  const [postponeTask, setPostponeTask] = useState<Task | null>(null);
  const [deleteTask, setDeleteTask] = useState<Task | null>(null);
  const [deleting, setDeleting] = useState(false);

  const categories = useMemo(() => {
    if (!snapshot) return [];
    return [...new Set(snapshot.tasks.map((task) => task.category))].sort();
  }, [snapshot]);

  const tasks = useMemo(() => {
    if (!snapshot) return [];
    const filtered = snapshot.tasks.filter((task) => {
      if (query) {
        const haystack = `${task.title} ${task.description} ${task.category} ${task.goalTitle ?? ''}`.toLowerCase();
        if (!haystack.includes(query.toLowerCase().trim())) return false;
      }
      if (priority !== 'all' && task.priority !== priority) return false;
      if (category !== 'all' && task.category !== category) return false;
      if (status === 'open' && task.completedAt) return false;
      if (status === 'completed' && !task.completedAt) return false;
      if (status !== 'all' && status !== 'open' && status !== 'completed' && task.status !== status) {
        return false;
      }
      return true;
    });

    return filtered.sort((a, b) => {
      if (sort === 'priority') return priorityOrder[b.priority] - priorityOrder[a.priority];
      if (sort === 'created') return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      if (sort === 'delay') return b.delayMinutes - a.delayMinutes;
      const aDue = a.deadline ? new Date(a.deadline).getTime() : Number.MAX_SAFE_INTEGER;
      const bDue = b.deadline ? new Date(b.deadline).getTime() : Number.MAX_SAFE_INTEGER;
      return aDue - bDue;
    });
  }, [snapshot, query, priority, category, status, sort]);

  if (loading) return <PageSkeleton />;
  if (error || !snapshot) {
    return <ErrorState message={error ?? 'Could not load your tasks.'} />;
  }

  const { summary, goals } = snapshot;
  const activeGoals = goals.filter((goal) => goal.status === 'active');

  function openCreate() {
    setFormTask(null);
    setFormOpen(true);
  }

  function openEdit(task: Task) {
    setDetailTask(null);
    setFormTask(task);
    setFormOpen(true);
  }

  async function onDelete() {
    if (!deleteTask) return;
    setDeleting(true);
    try {
      await actions.deleteTask(deleteTask.id);
      toast.success('Task deleted.');
      setDeleteTask(null);
    } catch (caught) {
      toastError(caught);
    } finally {
      setDeleting(false);
    }
  }

  const hasFilters = Boolean(query) || priority !== 'all' || category !== 'all';

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        eyebrow="Commitments"
        title="My Tasks"
        description="Every deadline you set, every reason you moved it, and every promise you kept."
        actions={
          <>
            <Link to="/planner" className={buttonStyles('secondary', 'md')}>
              <CalendarClock className="h-4 w-4" aria-hidden />
              Plan my day
            </Link>
            <Button icon={<Plus className="h-4 w-4" />} onClick={openCreate}>
              Add task
            </Button>
          </>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard label="Open tasks" value={summary.pending} detail={`${summary.totalTasks} total`} />
        <SummaryCard
          label="Overdue now"
          value={summary.overdue}
          detail={summary.overdue > 0 ? 'Passed their deadline' : 'Nothing behind you'}
          tone={summary.overdue > 0 ? 'rose' : 'default'}
        />
        <SummaryCard
          label="Postponed"
          value={summary.postponedOpen}
          detail={`${summary.postponeEvents} recorded moves`}
          tone={summary.postponedOpen > 0 ? 'amber' : 'default'}
        />
        <SummaryCard
          label="Completed"
          value={summary.completed}
          detail={`${summary.completionRate}% completion rate`}
          tone="emerald"
        />
      </div>

      <Card className="p-4 sm:p-5">
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500"
                aria-hidden
              />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search tasks, goals or categories…"
                className="pl-9"
                aria-label="Search tasks"
              />
            </div>
            <div className="flex items-center gap-2 sm:w-auto">
              <Select
                value={priority}
                onChange={(event) => setPriority(event.target.value as 'all' | Priority)}
                aria-label="Filter by priority"
                className="min-w-[130px]"
              >
                <option value="all">All priorities</option>
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </Select>
              <Select
                value={category}
                onChange={(event) => setCategory(event.target.value)}
                aria-label="Filter by category"
                className="min-w-[130px]"
              >
                <option value="all">All categories</option>
                {categories.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </Select>
              <Select
                value={sort}
                onChange={(event) => setSort(event.target.value)}
                aria-label="Sort tasks"
                className="min-w-[150px]"
              >
                {sortOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <Filter className="mr-1 h-3.5 w-3.5 text-slate-500" aria-hidden />
            {statusFilters.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setStatus(option.value)}
                className={
                  status === option.value
                    ? 'rounded-full border border-accent-400/30 bg-accent-500/15 px-2.5 py-1 text-[11px] font-medium text-accent-200'
                    : 'rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1 text-[11px] text-slate-400 transition hover:bg-white/[0.06] hover:text-slate-200'
                }
              >
                {option.label}
              </button>
            ))}
            {hasFilters ? (
              <button
                type="button"
                onClick={() => {
                  setQuery('');
                  setPriority('all');
                  setCategory('all');
                }}
                className="ml-1 text-[11px] text-slate-500 underline-offset-2 hover:text-slate-300 hover:underline"
              >
                Reset filters
              </button>
            ) : null}
          </div>
        </div>
      </Card>

      <div className="space-y-2.5">
        {tasks.length === 0 ? (
          <EmptyState
            icon={CheckCircle2}
            title={snapshot.tasks.length === 0 ? 'No tasks yet' : 'No tasks match this view'}
            description={
              snapshot.tasks.length === 0
                ? 'Add one real commitment with a deadline and an estimate. That is where the mirror starts.'
                : 'Try a different status, priority or search term.'
            }
            action={
              snapshot.tasks.length === 0 ? (
                <Button onClick={openCreate} icon={<Plus className="h-4 w-4" />}>
                  Add your first task
                </Button>
              ) : (
                <Button
                  variant="secondary"
                  onClick={() => {
                    setQuery('');
                    setStatus('all');
                    setPriority('all');
                    setCategory('all');
                  }}
                >
                  Clear filters
                </Button>
              )
            }
          />
        ) : (
          tasks.map((task) => {
            const due = deadlineInfo(task.deadline);
            return (
              <div
                key={task.id}
                role="button"
                tabIndex={0}
                onClick={() => setDetailTask(task)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    setDetailTask(task);
                  }
                }}
                className="surface group cursor-pointer p-4 transition hover:border-white/[0.14] hover:bg-white/[0.035]"
              >
                <div className="flex items-start gap-3">
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      if (!task.completedAt) setCompleteTask(task);
                    }}
                    disabled={Boolean(task.completedAt)}
                    className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition ${
                      task.completedAt
                        ? 'border-emerald-400/50 bg-emerald-500/20 text-emerald-300'
                        : 'border-white/20 text-transparent hover:border-emerald-400 hover:text-emerald-400'
                    }`}
                    aria-label={task.completedAt ? 'Task completed' : `Complete ${task.title}`}
                  >
                    <CheckCircle2 className="h-4 w-4" aria-hidden />
                  </button>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p
                          className={`truncate text-sm font-medium ${
                            task.completedAt ? 'text-slate-500 line-through' : 'text-slate-100'
                          }`}
                        >
                          {task.title}
                        </p>
                        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-500">
                          <span
                            className={
                              due.tone === 'overdue'
                                ? 'font-medium text-rose-300'
                                : due.tone === 'today'
                                  ? 'font-medium text-amber-300'
                                  : undefined
                            }
                          >
                            {due.label}
                          </span>
                          {task.deadline ? <span>{formatDateTime(task.deadline)}</span> : null}
                          {task.estimatedDuration ? (
                            <span className="inline-flex items-center gap-1">
                              <Clock className="h-3 w-3" aria-hidden />
                              {formatMinutes(task.estimatedDuration)}
                            </span>
                          ) : null}
                          {task.postponeCount > 0 ? (
                            <span className="inline-flex items-center gap-1 text-amber-400/90">
                              <History className="h-3 w-3" aria-hidden />
                              Moved {task.postponeCount}× · {formatMinutes(task.delayMinutes)} delay
                            </span>
                          ) : null}
                        </div>
                      </div>
                      <div className="flex shrink-0 flex-wrap items-center gap-1.5">
                        <StatusBadge status={task.status} />
                        <PriorityBadge priority={task.priority} />
                      </div>
                    </div>

                    {task.description ? (
                      <p className="mt-2 line-clamp-1 text-xs text-slate-500">{task.description}</p>
                    ) : null}

                    <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-slate-500">
                      <span className="rounded-md border border-white/10 bg-white/[0.03] px-1.5 py-0.5">
                        {task.category}
                      </span>
                      {task.goalTitle ? (
                        <span className="inline-flex items-center gap-1 text-accent-300/80">
                          <Target className="h-3 w-3" aria-hidden />
                          {task.goalTitle}
                        </span>
                      ) : null}
                      {task.estimatedLostMinutes > 0 ? (
                        <span className="text-rose-300/80">
                          ~{formatMinutes(task.estimatedLostMinutes)} estimated lost
                        </span>
                      ) : null}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      setDeleteTask(task);
                    }}
                    className="shrink-0 rounded-lg p-1.5 text-slate-600 opacity-0 transition hover:bg-rose-500/10 hover:text-rose-300 focus:opacity-100 group-hover:opacity-100"
                    aria-label={`Delete ${task.title}`}
                    title="Delete task"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {tasks.length > 0 ? (
        <p className="text-center text-[11px] text-slate-600">
          Showing {tasks.length} of {snapshot.tasks.length} tasks
        </p>
      ) : null}

      <TaskFormModal
        open={formOpen}
        task={formTask}
        onClose={() => {
          setFormOpen(false);
          setFormTask(null);
        }}
      />
      <TaskDetailModal
        open={Boolean(detailTask)}
        task={detailTask}
        onClose={() => setDetailTask(null)}
        onEdit={openEdit}
        onComplete={(task) => {
          setDetailTask(null);
          setCompleteTask(task);
        }}
        onPostpone={(task) => {
          setDetailTask(null);
          setPostponeTask(task);
        }}
      />
      <CompleteTaskModal
        open={Boolean(completeTask)}
        task={completeTask}
        onClose={() => setCompleteTask(null)}
      />
      <PostponeModal
        open={Boolean(postponeTask)}
        task={postponeTask}
        onClose={() => setPostponeTask(null)}
      />
      <ConfirmDialog
        open={Boolean(deleteTask)}
        onClose={() => setDeleteTask(null)}
        onConfirm={onDelete}
        loading={deleting}
        destructive
        title="Delete this task?"
        description={`“${deleteTask?.title ?? ''}” and its postponement history will be removed from this workspace. This cannot be undone.`}
        confirmLabel="Delete task"
      />
      {activeGoals.length === 0 && snapshot.tasks.length === 0 ? (
        <div className="rounded-xl border border-dashed border-white/10 p-4 text-center text-[11px] text-slate-500">
          Tip: attach tasks to a goal to see how delay affects the commitments that matter.
        </div>
      ) : null}
      <Badge className="sr-only">{summary.totalTasks} tasks</Badge>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  detail,
  tone = 'default',
}: {
  label: string;
  value: number;
  detail: string;
  tone?: 'default' | 'rose' | 'amber' | 'emerald';
}) {
  const toneClass = {
    default: 'text-slate-100',
    rose: 'text-rose-300',
    amber: 'text-amber-300',
    emerald: 'text-emerald-300',
  }[tone];

  return (
    <div className="surface p-4">
      <p className="text-[10px] font-medium uppercase tracking-wider text-slate-500">{label}</p>
      <p className={`mt-1.5 font-display text-2xl font-bold tabular-nums ${toneClass}`}>{value}</p>
      <p className="mt-0.5 text-[11px] text-slate-500">{detail}</p>
    </div>
  );
}

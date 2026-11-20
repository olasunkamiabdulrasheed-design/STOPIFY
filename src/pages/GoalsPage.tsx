import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import {
  Archive,
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  Plus,
  RotateCcw,
  Target,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button, buttonStyles } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Field, Input, Textarea } from '@/components/ui/Input';
import { Badge, GoalStatusBadge, PriorityBadge } from '@/components/ui/Badge';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { EmptyState } from '@/components/ui/EmptyState';
import { Modal } from '@/components/ui/Modal';
import { PageSkeleton, ErrorState } from '@/components/ui/Loading';
import { Progress } from '@/components/ui/Progress';
import { TaskFormModal, CompleteTaskModal, PostponeModal } from '@/components/tasks/TaskModals';
import { TaskDetailModal } from '@/components/tasks/TaskDetailModal';
import { useWorkspace } from '@/context/WorkspaceContext';
import { deadlineInfo, formatDate } from '@/lib/utils';
import { fromDateInput, toDateInputValue } from '@/lib/utils';
import { toastError } from '@/lib/toast';
import type { Goal, Task } from '@/lib/types';

export function GoalsPage() {
  const { snapshot, loading, error, actions } = useWorkspace();
  const [formOpen, setFormOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [deleteGoal, setDeleteGoal] = useState<Goal | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [taskFormGoal, setTaskFormGoal] = useState<string | null>(null);
  const [taskFormTask, setTaskFormTask] = useState<Task | null>(null);
  const [completeTask, setCompleteTask] = useState<Task | null>(null);
  const [postponeTask, setPostponeTask] = useState<Task | null>(null);
  const [detailTask, setDetailTask] = useState<Task | null>(null);
  const [busyGoal, setBusyGoal] = useState<string | null>(null);

  if (loading) return <PageSkeleton />;
  if (error || !snapshot) {
    return <ErrorState message={error ?? 'Could not load your goals.'} />;
  }

  const active = snapshot.goals.filter((goal) => goal.status === 'active');
  const closed = snapshot.goals.filter((goal) => goal.status !== 'active');

  function openCreate() {
    setEditingGoal(null);
    setFormOpen(true);
  }

  function openEdit(goal: Goal) {
    setEditingGoal(goal);
    setFormOpen(true);
  }

  async function setGoalStatus(goal: Goal, status: 'active' | 'completed' | 'archived') {
    setBusyGoal(goal.id);
    try {
      await actions.updateGoal(goal.id, { status });
      toast.success(
        status === 'completed'
          ? 'Goal marked complete.'
          : status === 'archived'
            ? 'Goal archived.'
            : 'Goal reopened.',
      );
    } catch (caught) {
      toastError(caught);
    } finally {
      setBusyGoal(null);
    }
  }

  async function onDelete() {
    if (!deleteGoal) return;
    setDeleting(true);
    try {
      await actions.deleteGoal(deleteGoal.id);
      toast.success('Goal deleted. Its tasks were kept.');
      setDeleteGoal(null);
    } catch (caught) {
      toastError(caught);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        eyebrow="Direction"
        title="Goals"
        description="Make the bigger commitment visible, then attach the tasks that actually move it."
        actions={
          <>
            <Link to="/tasks" className={buttonStyles('secondary', 'md')}>
              All tasks
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
            <Button icon={<Plus className="h-4 w-4" />} onClick={openCreate}>
              New goal
            </Button>
          </>
        }
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <GoalStat label="Active goals" value={active.length} detail="Currently protected" />
        <GoalStat
          label="At risk"
          value={active.filter((goal) => goal.atRisk).length}
          detail="Overdue or delayed work"
          tone="rose"
        />
        <GoalStat
          label="Completed"
          value={snapshot.goals.filter((goal) => goal.status === 'completed').length}
          detail="Marked done by you"
          tone="emerald"
        />
      </div>

      {active.length === 0 ? (
        <EmptyState
          icon={Target}
          title={snapshot.goals.length === 0 ? 'No goals yet' : 'No active goals'}
          description="A goal gives your tasks a direction and makes delay mean something. Create one, then attach the next task."
          action={
            <Button onClick={openCreate} icon={<Plus className="h-4 w-4" />}>
              Create a goal
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {active.map((goal) => (
            <GoalCard
              key={goal.id}
              goal={goal}
              tasks={snapshot.tasks.filter((task) => task.goalId === goal.id)}
              busy={busyGoal === goal.id}
              onEdit={() => openEdit(goal)}
              onAddTask={() => {
                setTaskFormTask(null);
                setTaskFormGoal(goal.id);
              }}
              onCompleteTask={setCompleteTask}
              onOpenTask={(task) => setDetailTask(task)}
              onStatus={(status) => void setGoalStatus(goal, status)}
              onDelete={() => setDeleteGoal(goal)}
            />
          ))}
        </div>
      )}

      {closed.length > 0 ? (
        <div className="space-y-3">
          <div>
            <h2 className="font-display text-base font-semibold text-slate-100">Closed goals</h2>
            <p className="mt-1 text-xs text-slate-400">Completed or archived commitments.</p>
          </div>
          <div className="grid gap-3 lg:grid-cols-2">
            {closed.map((goal) => (
              <Card key={goal.id} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-300">{goal.title}</p>
                    <p className="mt-1 text-[11px] text-slate-500">
                      {goal.completedCount}/{goal.taskCount} tasks completed
                      {goal.targetDate ? ` · target ${formatDate(goal.targetDate)}` : ''}
                    </p>
                  </div>
                  <GoalStatusBadge status={goal.status} />
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    icon={<RotateCcw className="h-3.5 w-3.5" />}
                    disabled={busyGoal === goal.id}
                    onClick={() => void setGoalStatus(goal, 'active')}
                  >
                    Reopen
                  </Button>
                  {goal.status !== 'archived' ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      icon={<Archive className="h-3.5 w-3.5" />}
                      disabled={busyGoal === goal.id}
                      onClick={() => void setGoalStatus(goal, 'archived')}
                    >
                      Archive
                    </Button>
                  ) : null}
                  <Button
                    variant="ghost"
                    size="sm"
                    icon={<Trash2 className="h-3.5 w-3.5" />}
                    onClick={() => setDeleteGoal(goal)}
                  >
                    Delete
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      ) : null}

      <GoalFormModal
        open={formOpen}
        goal={editingGoal}
        onClose={() => {
          setFormOpen(false);
          setEditingGoal(null);
        }}
      />
      <TaskFormModal
        open={Boolean(taskFormGoal) || Boolean(taskFormTask)}
        task={taskFormTask}
        defaultGoalId={taskFormGoal}
        onClose={() => {
          setTaskFormGoal(null);
          setTaskFormTask(null);
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
      <TaskDetailModal
        open={Boolean(detailTask)}
        task={detailTask}
        onClose={() => setDetailTask(null)}
        onEdit={(task) => {
          setDetailTask(null);
          setTaskFormGoal(null);
          setTaskFormTask(task);
        }}
        onComplete={(task) => {
          setDetailTask(null);
          setCompleteTask(task);
        }}
        onPostpone={(task) => {
          setDetailTask(null);
          setPostponeTask(task);
        }}
      />
      <ConfirmDialog
        open={Boolean(deleteGoal)}
        onClose={() => setDeleteGoal(null)}
        onConfirm={onDelete}
        loading={deleting}
        destructive
        title="Delete this goal?"
        description={`“${deleteGoal?.title ?? ''}” will be removed. Its tasks will stay in your workspace without a goal. This cannot be undone.`}
        confirmLabel="Delete goal"
      />
    </div>
  );
}

function GoalCard({
  goal,
  tasks,
  busy,
  onEdit,
  onAddTask,
  onCompleteTask,
  onOpenTask,
  onStatus,
  onDelete,
}: {
  goal: Goal;
  tasks: Task[];
  busy: boolean;
  onEdit: () => void;
  onAddTask: () => void;
  onCompleteTask: (task: Task) => void;
  onOpenTask: (task: Task) => void;
  onStatus: (status: 'completed' | 'archived') => void;
  onDelete: () => void;
}) {
  const open = tasks.filter((task) => !task.completedAt);
  const next = [...open]
    .sort((a, b) => {
      const aDue = a.deadline ? new Date(a.deadline).getTime() : Number.MAX_SAFE_INTEGER;
      const bDue = b.deadline ? new Date(b.deadline).getTime() : Number.MAX_SAFE_INTEGER;
      return aDue - bDue;
    })
    .slice(0, 4);

  return (
    <Card className={`p-5 ${goal.atRisk ? 'border-rose-500/20' : ''}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <GoalStatusBadge status={goal.status} />
            {goal.atRisk ? <Badge tone="rose">At risk</Badge> : null}
          </div>
          <h2 className="mt-2 font-display text-lg font-semibold leading-snug text-slate-100">
            {goal.title}
          </h2>
          {goal.description ? (
            <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-slate-400">
              {goal.description}
            </p>
          ) : null}
        </div>
        <span className="shrink-0 font-display text-xl font-bold tabular-nums text-slate-200">
          {goal.progress}%
        </span>
      </div>

      <Progress
        value={goal.progress}
        className="mt-4 h-2"
        barClassName={goal.atRisk ? 'bg-rose-400' : 'bg-accent-500'}
        label={`${goal.title} progress`}
      />

      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-500">
        <span>
          {goal.completedCount}/{goal.taskCount} tasks complete
        </span>
        {goal.targetDate ? (
          <span className="inline-flex items-center gap-1">
            <CalendarClock className="h-3 w-3" aria-hidden />
            Target {formatDate(goal.targetDate)}
          </span>
        ) : null}
        {goal.overdueCount > 0 ? (
          <span className="text-rose-300">{goal.overdueCount} overdue</span>
        ) : null}
        {goal.delayedCount > 0 ? (
          <span className="text-amber-300">{goal.delayedCount} delayed</span>
        ) : null}
      </div>

      <div className="mt-4 border-t border-white/[0.07] pt-3">
        {next.length === 0 ? (
          <p className="rounded-lg border border-dashed border-white/10 px-3 py-3 text-center text-[11px] text-slate-500">
            {goal.taskCount === 0
              ? 'No tasks attached yet. Add the first real step.'
              : 'All attached tasks are complete.'}
          </p>
        ) : (
          <ul className="space-y-1.5">
            {next.map((task) => {
              const due = deadlineInfo(task.deadline);
              return (
                <li key={task.id}>
                  <div className="flex items-center gap-2 rounded-lg px-1 py-1 transition hover:bg-white/[0.03]">
                    <button
                      type="button"
                      onClick={() => onCompleteTask(task)}
                      className="group flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-white/20 text-transparent hover:border-emerald-400 hover:text-emerald-400"
                      aria-label={`Complete ${task.title}`}
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
                    </button>
                    <button
                      type="button"
                      onClick={() => onOpenTask(task)}
                      className="min-w-0 flex-1 text-left"
                    >
                      <span className="block truncate text-[11px] text-slate-300">{task.title}</span>
                      <span
                        className={`block text-[10px] ${
                          due.tone === 'overdue' ? 'text-rose-300' : 'text-slate-500'
                        }`}
                      >
                        {due.label}
                      </span>
                    </button>
                    <PriorityBadge priority={task.priority} />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        <Button variant="secondary" size="sm" onClick={onAddTask} icon={<Plus className="h-3.5 w-3.5" />}>
          Add task
        </Button>
        <Button variant="ghost" size="sm" onClick={onEdit}>
          Edit
        </Button>
        <Button
          variant="ghost"
          size="sm"
          disabled={busy}
          onClick={() => onStatus('completed')}
          icon={<CheckCircle2 className="h-3.5 w-3.5" />}
        >
          Complete
        </Button>
        <Button
          variant="ghost"
          size="sm"
          disabled={busy}
          onClick={() => onStatus('archived')}
          icon={<Archive className="h-3.5 w-3.5" />}
        >
          Archive
        </Button>
        <button
          type="button"
          onClick={onDelete}
          className="ml-auto rounded-lg p-1.5 text-slate-600 transition hover:bg-rose-500/10 hover:text-rose-300"
          aria-label={`Delete ${goal.title}`}
          title="Delete goal"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </Card>
  );
}

function GoalStat({
  label,
  value,
  detail,
  tone = 'default',
}: {
  label: string;
  value: number;
  detail: string;
  tone?: 'default' | 'rose' | 'emerald';
}) {
  const toneClass = {
    default: 'text-slate-100',
    rose: 'text-rose-300',
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

function GoalFormModal({
  open,
  goal,
  onClose,
}: {
  open: boolean;
  goal: Goal | null;
  onClose: () => void;
}) {
  const { actions } = useWorkspace();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setTitle(goal?.title ?? '');
    setDescription(goal?.description ?? '');
    setTargetDate(toDateInputValue(goal?.targetDate ?? null));
    setError(null);
    setSaving(false);
  }, [open, goal]);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    if (title.trim().length < 2) {
      setError('Give the goal a clear title.');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        title: title.trim(),
        description: description.trim(),
        targetDate: fromDateInput(targetDate),
      };
      if (goal) {
        await actions.updateGoal(goal.id, payload);
        toast.success('Goal updated.');
      } else {
        await actions.createGoal(payload);
        toast.success('Goal created. Attach a task to it.');
      }
      onClose();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not save this goal.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={goal ? 'Edit goal' : 'New goal'}
      description="Name the outcome you care about, not the activity."
      size="md"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" form="goal-form" loading={saving}>
            {goal ? 'Save changes' : 'Create goal'}
          </Button>
        </div>
      }
    >
      <form id="goal-form" onSubmit={onSubmit} className="space-y-4">
        <Field label="Goal title" htmlFor="goal-title" required>
          <Input
            id="goal-title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="e.g. Finish MSc dissertation"
            maxLength={160}
            required
          />
        </Field>
        <Field label="Description" htmlFor="goal-description" hint="What does done look like?">
          <Textarea
            id="goal-description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            maxLength={1000}
            className="min-h-[90px]"
          />
        </Field>
        <Field label="Target date" htmlFor="goal-date" hint="Used to flag this goal when work slips.">
          <Input
            id="goal-date"
            type="date"
            value={targetDate}
            onChange={(event) => setTargetDate(event.target.value)}
          />
        </Field>
        {error ? (
          <div className="rounded-xl border border-rose-500/25 bg-rose-500/10 px-3.5 py-3 text-xs text-rose-200">
            {error}
          </div>
        ) : null}
      </form>
    </Modal>
  );
}

import { useEffect, useId, useState, type FormEvent } from 'react';
import { toast } from 'sonner';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Field, Input, Select, Textarea } from '@/components/ui/Input';
import { useWorkspace } from '@/context/WorkspaceContext';
import { errorMessage } from '@/lib/toast';
import { fromDateTimeLocal, toDateTimeLocal } from '@/lib/utils';
import type { Priority, Task } from '@/lib/types';

const CATEGORIES = [
  'General',
  'Study',
  'Assignment',
  'Research',
  'Writing',
  'Coding',
  'Lab',
  'Reading',
  'Exam prep',
  'Personal',
  'Work',
];

const priorities: { value: Priority; label: string }[] = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'critical', label: 'Critical' },
];

interface TaskFormModalProps {
  open: boolean;
  onClose: () => void;
  onSaved?: () => void;
  task?: Task | null;
  defaultGoalId?: string | null;
}

export function TaskFormModal({
  open,
  onClose,
  onSaved,
  task,
  defaultGoalId,
}: TaskFormModalProps) {
  const { snapshot, actions } = useWorkspace();
  const goals = snapshot?.goals ?? [];
  const categoryListId = useId();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('General');
  const [priority, setPriority] = useState<Priority>('medium');
  const [deadline, setDeadline] = useState('');
  const [estimate, setEstimate] = useState('');
  const [goalId, setGoalId] = useState('');
  const [status, setStatus] = useState<'not_started' | 'in_progress' | 'postponed'>('not_started');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const isEdit = Boolean(task);

  useEffect(() => {
    if (!open) return;
    setTitle(task?.title ?? '');
    setDescription(task?.description ?? '');
    setCategory(task?.category ?? 'General');
    setPriority(task?.priority ?? 'medium');
    setDeadline(toDateTimeLocal(task?.deadline ?? null));
    setEstimate(task?.estimatedDuration ? String(task.estimatedDuration) : '');
    setGoalId(task?.goalId ?? defaultGoalId ?? '');
    setStatus(
      task && !task.completedAt && task.storedStatus !== 'completed'
        ? (task.storedStatus as 'not_started' | 'in_progress' | 'postponed')
        : 'not_started',
    );
    setError(null);
    setSaving(false);
  }, [open, task, defaultGoalId]);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    if (title.trim().length < 1) {
      setError('Give your task a title.');
      return;
    }
    const estimateNumber = estimate.trim() === '' ? null : Number(estimate);
    if (estimateNumber !== null && (!Number.isFinite(estimateNumber) || estimateNumber < 5 || estimateNumber > 1440)) {
      setError('Estimated time must be between 5 and 1440 minutes.');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        title: title.trim(),
        description: description.trim(),
        category: category.trim() || 'General',
        priority,
        deadline: fromDateTimeLocal(deadline),
        estimatedDuration: estimateNumber,
        goalId: goalId || null,
      };
      const statusPatch =
        !task?.completedAt && task?.storedStatus !== 'completed' ? { status } : {};

      if (isEdit && task) {
        await actions.updateTask(task.id, { ...payload, ...statusPatch });
        toast.success('Task updated.');
      } else {
        await actions.createTask(payload);
        toast.success('Task added. Give it a real deadline.');
      }
      onSaved?.();
      onClose();
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? 'Edit task' : 'Add a task'}
      description={
        isEdit
          ? 'Update the commitment. Deadline changes made here do not create a postponement record.'
          : 'Set a deadline you intend to keep. Postponing it later will be tracked.'
      }
      size="lg"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button
            type="submit"
            form="task-form"
            loading={saving}
            disabled={saving}
          >
            {isEdit ? 'Save changes' : 'Add task'}
          </Button>
        </div>
      }
    >
      <form id="task-form" onSubmit={onSubmit} className="space-y-4">
        <Field label="Task title" htmlFor="task-title" required>
          <Input
            id="task-title"
            placeholder="e.g. Finish the statistics problem set"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            maxLength={200}
            required
          />
        </Field>

        <Field label="Description" htmlFor="task-description" hint="Optional, but future-you will thank you.">
          <Textarea
            id="task-description"
            placeholder="What exactly needs to be done? What does done look like?"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            maxLength={5000}
            className="min-h-[88px]"
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Category" htmlFor="task-category">
            <Input
              id="task-category"
              list={categoryListId}
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              placeholder="General"
              maxLength={60}
            />
            <datalist id={categoryListId}>
              {CATEGORIES.map((item) => (
                <option key={item} value={item} />
              ))}
            </datalist>
          </Field>

          <Field label="Priority" htmlFor="task-priority">
            <Select
              id="task-priority"
              value={priority}
              onChange={(event) => setPriority(event.target.value as Priority)}
            >
              {priorities.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Deadline" htmlFor="task-deadline" hint="Leave empty only if it truly has no date.">
            <Input
              id="task-deadline"
              type="datetime-local"
              value={deadline}
              onChange={(event) => setDeadline(event.target.value)}
            />
          </Field>

          <Field label="Estimated minutes" htmlFor="task-estimate" hint="Used by the planner and consequence engine.">
            <Input
              id="task-estimate"
              type="number"
              min={5}
              max={1440}
              step={5}
              placeholder="e.g. 90"
              value={estimate}
              onChange={(event) => setEstimate(event.target.value)}
            />
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Linked goal" htmlFor="task-goal" hint="Attach work to a bigger commitment.">
            <Select
              id="task-goal"
              value={goalId}
              onChange={(event) => setGoalId(event.target.value)}
            >
              <option value="">No goal</option>
              {goals.map((goal) => (
                <option key={goal.id} value={goal.id}>
                  {goal.title}
                </option>
              ))}
            </Select>
          </Field>

          {isEdit && !task?.completedAt ? (
            <Field label="Status" htmlFor="task-status">
              <Select
                id="task-status"
                value={status}
                onChange={(event) =>
                  setStatus(event.target.value as 'not_started' | 'in_progress' | 'postponed')
                }
              >
                <option value="not_started">Not started</option>
                <option value="in_progress">In progress</option>
                <option value="postponed">Postponed</option>
              </Select>
            </Field>
          ) : (
            <div className="hidden sm:block" />
          )}
        </div>

        {error ? (
          <div className="rounded-xl border border-rose-500/25 bg-rose-500/10 px-3.5 py-3 text-xs text-rose-200">
            {error}
          </div>
        ) : null}
      </form>
    </Modal>
  );
}

export function CompleteTaskModal({
  open,
  onClose,
  task,
  onCompleted,
}: {
  open: boolean;
  onClose: () => void;
  task: Task | null;
  onCompleted?: () => void;
}) {
  const { actions } = useWorkspace();
  const [actual, setActual] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setActual(task?.estimatedDuration ? String(task.estimatedDuration) : '');
    setSaving(false);
    setError(null);
  }, [open, task]);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!task) return;
    const value = actual.trim() === '' ? null : Number(actual);
    if (value !== null && (!Number.isFinite(value) || value < 1 || value > 1440)) {
      setError('Actual time must be between 1 and 1440 minutes.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await actions.completeTask(task.id, value);
      toast.success('Task completed. That is a kept promise.');
      onCompleted?.();
      onClose();
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Complete task"
      description={task?.title}
      size="sm"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button
            type="submit"
            form="complete-task-form"
            loading={saving}
            variant="success"
          >
            Mark complete
          </Button>
        </div>
      }
    >
      <form id="complete-task-form" onSubmit={onSubmit} className="space-y-4">
        <Field
          label="Actual time spent (minutes)"
          htmlFor="actual-duration"
          hint="Optional. Honest estimates make the consequence projections better."
        >
          <Input
            id="actual-duration"
            type="number"
            min={1}
            max={1440}
            placeholder="e.g. 75"
            value={actual}
            onChange={(event) => setActual(event.target.value)}
          />
        </Field>
        {task?.deadline ? (
          <p className="rounded-xl border border-white/[0.08] bg-white/[0.03] px-3.5 py-2.5 text-[11px] leading-relaxed text-slate-400">
            Completing now will be recorded against the deadline you set. If you are late, the
            lateness becomes part of your analytics.
          </p>
        ) : null}
        {error ? (
          <div className="rounded-xl border border-rose-500/25 bg-rose-500/10 px-3.5 py-3 text-xs text-rose-200">
            {error}
          </div>
        ) : null}
      </form>
    </Modal>
  );
}

export function PostponeModal({
  open,
  onClose,
  task,
  onPostponed,
}: {
  open: boolean;
  onClose: () => void;
  task: Task | null;
  onPostponed?: () => void;
}) {
  const { actions } = useWorkspace();
  const [reason, setReason] = useState('');
  const [newDeadline, setNewDeadline] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setReason('');
    const base = new Date();
    base.setDate(base.getDate() + 1);
    base.setHours(18, 0, 0, 0);
    setNewDeadline(toDateTimeLocal(base.toISOString()));
    setSaving(false);
    setError(null);
  }, [open, task]);

  const reasons = [
    'Too big to start',
    'Got distracted',
    'Low energy',
    'Waiting on someone',
    'Priority changed',
    'Underestimated the work',
  ];

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!task) return;
    if (!reason.trim() && !newDeadline) {
      setError('Add a reason or a new deadline before postponing.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const next = await actions.postponeTask(task.id, {
        newDeadline: fromDateTimeLocal(newDeadline),
        reason: reason.trim(),
      });
      const updated = next.tasks.find((item) => item.id === task.id);
      const extension = updated?.extensionMinutes ?? 0;
      toast.warning(
        extension > 0
          ? `Postponed. ${extension} minutes have been added to the delay ledger.`
          : 'Postponed. The reason has been recorded.',
      );
      onPostponed?.();
      onClose();
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Postpone this task?"
      description={task?.title}
      size="md"
      footer={
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            Keep the deadline
          </Button>
          <Button
            type="submit"
            form="postpone-task-form"
            loading={saving}
            className="bg-amber-500 text-amber-950 shadow-none hover:bg-amber-400"
          >
            Postpone and record it
          </Button>
        </div>
      }
    >
      <form id="postpone-task-form" onSubmit={onSubmit} className="space-y-4">
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/[0.06] px-3.5 py-3 text-xs leading-relaxed text-amber-100/80">
          This is not a failure — it is information. STOPIFY will keep the original deadline, the new
          deadline and your reason, then show the real cost in your insights.
        </div>

        <Field label="Why are you postponing?" htmlFor="postpone-reason">
          <Textarea
            id="postpone-reason"
            placeholder="Be specific. What actually got in the way?"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            maxLength={500}
            className="min-h-[80px]"
          />
        </Field>

        <div className="flex flex-wrap gap-1.5">
          {reasons.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setReason(item)}
              className={
                reason === item
                  ? 'rounded-full border border-amber-400/40 bg-amber-500/15 px-2.5 py-1 text-[11px] text-amber-200'
                  : 'rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11px] text-slate-400 transition hover:bg-white/[0.08] hover:text-slate-200'
              }
            >
              {item}
            </button>
          ))}
        </div>

        <Field
          label="New deadline"
          htmlFor="postpone-deadline"
          hint={
            task?.deadline
              ? `Current deadline: ${new Date(task.deadline).toLocaleString()}`
              : 'This task currently has no deadline.'
          }
        >
          <Input
            id="postpone-deadline"
            type="datetime-local"
            value={newDeadline}
            onChange={(event) => setNewDeadline(event.target.value)}
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

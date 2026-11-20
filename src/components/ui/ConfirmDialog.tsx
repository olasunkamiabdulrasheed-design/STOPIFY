import { AlertTriangle } from 'lucide-react';
import { Button } from './Button';
import { Modal } from './Modal';

interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  loading?: boolean;
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  destructive = false,
  loading = false,
}: ConfirmDialogProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      size="sm"
      title={title}
      hideClose={loading}
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button
            variant={destructive ? 'danger' : 'primary'}
            onClick={() => void onConfirm()}
            loading={loading}
          >
            {confirmLabel}
          </Button>
        </div>
      }
    >
      <div className="flex gap-3">
        <div
          className={
            destructive
              ? 'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-rose-500/10 text-rose-300'
              : 'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent-500/10 text-accent-300'
          }
        >
          <AlertTriangle className="h-4 w-4" aria-hidden />
        </div>
        <p className="text-sm leading-relaxed text-slate-300">{description}</p>
      </div>
    </Modal>
  );
}

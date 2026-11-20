import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

export const TZ_OFFSET = new Date().getTimezoneOffset();

export function apiUrlWithTz(path: string): string {
  const separator = path.includes('?') ? '&' : '?';
  return `${path}${separator}tz=${TZ_OFFSET}`;
}

export function pad(value: number): string {
  return String(value).padStart(2, '0');
}

export function localDateKey(date = new Date()): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function parseDateKey(key: string): Date {
  return new Date(`${key}T12:00:00`);
}

export function formatDate(
  value: string | Date | null | undefined,
  options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', year: 'numeric' },
): string {
  if (!value) return '—';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('en-US', options).format(date);
}

export function formatDateKey(key: string | null | undefined): string {
  if (!key) return '—';
  return formatDate(parseDateKey(key), { month: 'short', day: 'numeric', year: 'numeric' });
}

export function formatDateKeyShort(key: string | null | undefined): string {
  if (!key) return '—';
  return formatDate(parseDateKey(key), { month: 'short', day: 'numeric' });
}

export function formatDateTime(value: string | Date | null | undefined): string {
  if (!value) return '—';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
}

export function formatTime(value: string | Date | null | undefined): string {
  if (!value) return '—';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' }).format(date);
}

export function startOfLocalDay(date = new Date()): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function daysBetweenLocal(a: Date, b: Date): number {
  const ms = startOfLocalDay(a).getTime() - startOfLocalDay(b).getTime();
  return Math.round(ms / 86_400_000);
}

export type DeadlineTone = 'overdue' | 'today' | 'soon' | 'later' | 'none';

export function deadlineInfo(
  iso: string | null | undefined,
  now = new Date(),
): { label: string; tone: DeadlineTone; days: number | null } {
  if (!iso) return { label: 'No deadline', tone: 'none', days: null };
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return { label: 'No deadline', tone: 'none', days: null };
  const diff = daysBetweenLocal(date, now);
  const time = formatTime(date);

  if (diff < 0) {
    const days = Math.abs(diff);
    return {
      label: `${days} ${days === 1 ? 'day' : 'days'} overdue`,
      tone: 'overdue',
      days: diff,
    };
  }
  if (diff === 0) {
    const isPast = date.getTime() < now.getTime();
    return isPast
      ? { label: 'Overdue today', tone: 'overdue', days: diff }
      : { label: `Due today, ${time}`, tone: 'today', days: diff };
  }
  if (diff === 1) return { label: 'Due tomorrow', tone: 'soon', days: diff };
  if (diff <= 3) return { label: `Due in ${diff} days`, tone: 'soon', days: diff };
  return {
    label: `Due ${formatDate(date, { month: 'short', day: 'numeric' })}`,
    tone: 'later',
    days: diff,
  };
}

export function formatMinutes(minutes: number | null | undefined): string {
  const value = Math.max(0, Math.round(Number(minutes) || 0));
  if (value < 60) return `${value} min`;
  const hours = Math.floor(value / 60);
  const rest = value % 60;
  return rest > 0 ? `${hours}h ${rest}m` : `${hours}h`;
}

export function formatHours(minutes: number | null | undefined): string {
  const value = Math.max(0, Number(minutes) || 0);
  const hours = value / 60;
  if (hours >= 10) return `${Math.round(hours)}h`;
  return `${hours.toFixed(1).replace(/\.0$/, '')}h`;
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'S';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export function greeting(now = new Date()): string {
  const hour = now.getHours();
  if (hour < 5) return 'Still up';
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

export function todayLong(now = new Date()): string {
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  }).format(now);
}

export function humanDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  return formatDateTime(iso);
}

export function clampNumber(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function roundScore(value: number | null | undefined): string {
  return value === null || value === undefined ? '—' : `${value}`;
}

export function scoreLabel(score: number | null): string {
  if (score === null) return 'Not enough data yet';
  if (score >= 85) return 'Excellent momentum';
  if (score >= 70) return 'Strong progress';
  if (score >= 50) return 'Building consistency';
  if (score >= 30) return 'Finding your rhythm';
  return 'Time for a reset';
}

export function pluralize(count: number, singular: string, plural?: string): string {
  return count === 1 ? singular : plural ?? `${singular}s`;
}

export function truncate(text: string, length = 120): string {
  if (text.length <= length) return text;
  return `${text.slice(0, length - 1).trimEnd()}…`;
}

export function downloadJson(filename: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function toDateTimeLocal(iso: string | null | undefined): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours(),
  )}:${pad(date.getMinutes())}`;
}

export function fromDateTimeLocal(value: string): string | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export function toDateInputValue(iso: string | null | undefined): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function fromDateInput(value: string): string | null {
  if (!value) return null;
  const date = new Date(`${value}T23:59:00`);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export function defaultDeadlineLocal(daysAhead = 1): string {
  const date = new Date();
  date.setDate(date.getDate() + daysAhead);
  date.setHours(18, 0, 0, 0);
  return toDateTimeLocal(date.toISOString());
}

export function addMinutesToClock(clock: string, minutes: number): string {
  const [hours, mins] = clock.split(':').map(Number);
  const total = Math.max(0, hours * 60 + mins + minutes);
  const normalized = total % (24 * 60);
  return `${pad(Math.floor(normalized / 60))}:${pad(normalized % 60)}`;
}

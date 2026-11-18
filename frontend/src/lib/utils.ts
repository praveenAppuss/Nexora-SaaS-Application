import clsx, { type ClassValue } from 'clsx';

export function cn(...inputs: ClassValue[]): string {
  return clsx(inputs);
}

export function initialsFromName(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');
}

export const isMacPlatform =
  typeof navigator !== 'undefined' && /Mac|iPhone|iPad|iPod/.test(navigator.userAgent);

const relativeTime = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
const absoluteDate = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' });
const absoluteDateWithYear = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
});
const sprintRangeFormat = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' });

export function formatRelativeTime(value: string): string {
  const timestamp = new Date(value).getTime();
  if (Number.isNaN(timestamp)) return '';
  const diffSeconds = Math.round((timestamp - Date.now()) / 1000);
  const absolute = Math.abs(diffSeconds);

  if (absolute < 45) return 'just now';
  if (absolute < 3600) return relativeTime.format(Math.round(diffSeconds / 60), 'minute');
  if (absolute < 86400) return relativeTime.format(Math.round(diffSeconds / 3600), 'hour');
  if (absolute < 604800) return relativeTime.format(Math.round(diffSeconds / 86400), 'day');

  const date = new Date(value);
  return date.getFullYear() === new Date().getFullYear()
    ? absoluteDate.format(date)
    : absoluteDateWithYear.format(date);
}

export function formatDate(value: string | null): string {
  if (!value) return 'Not scheduled';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Not scheduled';
  return absoluteDateWithYear.format(date);
}

export function formatSprintRange(start: string | null, end: string | null): string {
  if (!start || !end) return 'No dates set';
  const startDate = new Date(start);
  const endDate = new Date(end);
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    return 'No dates set';
  }
  return `${sprintRangeFormat.format(startDate)} – ${sprintRangeFormat.format(endDate)}`;
}

export function percentage(completed: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((completed / total) * 100);
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

import type { Priority, SprintStatus, TaskStatus } from '../types';

export const TASK_STATUSES: TaskStatus[] = [
  'backlog',
  'todo',
  'in_progress',
  'in_review',
  'done',
];

export const PRIORITIES: Priority[] = ['urgent', 'high', 'medium', 'low', 'none'];

interface StatusMeta {
  label: string;
  dot: string;
  text: string;
  soft: string;
}

export const STATUS_META: Record<TaskStatus, StatusMeta> = {
  backlog: {
    label: 'Backlog',
    dot: 'bg-zinc-400',
    text: 'text-zinc-500 dark:text-zinc-400',
    soft: 'bg-zinc-500/10 text-zinc-600 dark:text-zinc-300 border-zinc-500/20',
  },
  todo: {
    label: 'Todo',
    dot: 'bg-sky-400',
    text: 'text-sky-600 dark:text-sky-300',
    soft: 'bg-sky-500/10 text-sky-600 dark:text-sky-300 border-sky-500/20',
  },
  in_progress: {
    label: 'In Progress',
    dot: 'bg-amber-400',
    text: 'text-amber-600 dark:text-amber-300',
    soft: 'bg-amber-500/10 text-amber-600 dark:text-amber-300 border-amber-500/20',
  },
  in_review: {
    label: 'In Review',
    dot: 'bg-violet-400',
    text: 'text-violet-600 dark:text-violet-300',
    soft: 'bg-violet-500/10 text-violet-600 dark:text-violet-300 border-violet-500/20',
  },
  done: {
    label: 'Done',
    dot: 'bg-emerald-400',
    text: 'text-emerald-600 dark:text-emerald-300',
    soft: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-300 border-emerald-500/20',
  },
};

interface PriorityMeta {
  label: string;
  text: string;
  soft: string;
}

export const PRIORITY_META: Record<Priority, PriorityMeta> = {
  urgent: {
    label: 'Urgent',
    text: 'text-red-500 dark:text-red-400',
    soft: 'bg-red-500/10 text-red-600 dark:text-red-300 border-red-500/20',
  },
  high: {
    label: 'High',
    text: 'text-orange-500 dark:text-orange-400',
    soft: 'bg-orange-500/10 text-orange-600 dark:text-orange-300 border-orange-500/20',
  },
  medium: {
    label: 'Medium',
    text: 'text-amber-500 dark:text-amber-300',
    soft: 'bg-amber-500/10 text-amber-600 dark:text-amber-300 border-amber-500/20',
  },
  low: {
    label: 'Low',
    text: 'text-sky-500 dark:text-sky-400',
    soft: 'bg-sky-500/10 text-sky-600 dark:text-sky-300 border-sky-500/20',
  },
  none: {
    label: 'No priority',
    text: 'text-subtle',
    soft: 'bg-zinc-500/10 text-subtle border-zinc-500/20',
  },
};

export const SPRINT_STATUS_META: Record<
  SprintStatus,
  { label: string; dot: string; soft: string }
> = {
  active: {
    label: 'Active',
    dot: 'bg-emerald-400',
    soft: 'border-emerald-500/25 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300',
  },
  completed: {
    label: 'Completed',
    dot: 'bg-brand-soft',
    soft: 'border-brand/25 bg-brand/10 text-brand dark:text-brand-soft',
  },
  planned: {
    label: 'Backlog',
    dot: 'bg-zinc-400',
    soft: 'border-zinc-500/25 bg-zinc-500/10 text-zinc-500 dark:text-zinc-400',
  },
};

export const SPRINT_STATUS_ORDER: SprintStatus[] = ['active', 'completed', 'planned'];

export function isTaskStatus(value: string): value is TaskStatus {
  return (TASK_STATUSES as string[]).includes(value);
}

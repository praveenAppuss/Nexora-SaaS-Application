import { X } from 'lucide-react';
import type { Label, LabelColor } from '../../types';
import { cn } from '../../lib/utils';

const TONES: Record<LabelColor, string> = {
  blue: 'border-blue-500/20 bg-blue-500/10 text-blue-600 dark:text-blue-300',
  emerald: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300',
  red: 'border-red-500/20 bg-red-500/10 text-red-600 dark:text-red-300',
  violet: 'border-violet-500/20 bg-violet-500/10 text-violet-600 dark:text-violet-300',
  amber: 'border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-300',
  sky: 'border-sky-500/20 bg-sky-500/10 text-sky-600 dark:text-sky-300',
  pink: 'border-pink-500/20 bg-pink-500/10 text-pink-600 dark:text-pink-300',
  lime: 'border-lime-500/20 bg-lime-500/10 text-lime-600 dark:text-lime-300',
};

export function LabelPill({
  label,
  className,
  onRemove,
}: {
  label: Label;
  className?: string;
  onRemove?: () => void;
}) {
  return (
    <span
      className={cn(
        'inline-flex max-w-full items-center gap-1 rounded-md border px-1.5 py-[1px] text-[10px] font-medium leading-4',
        TONES[label.color],
        className,
      )}
    >
      <span className="truncate">{label.name}</span>
      {onRemove && (
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onRemove();
          }}
          aria-label={`Remove ${label.name} label`}
          className="-mr-0.5 rounded-sm p-px opacity-70 transition hover:bg-current/10 hover:opacity-100"
        >
          <X className="h-2.5 w-2.5" />
        </button>
      )}
    </span>
  );
}

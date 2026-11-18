import type { Priority } from '../../types';
import { PRIORITY_META } from '../../lib/constants';
import { cn } from '../../lib/utils';

const LEVELS: Record<Priority, number> = {
  none: 0,
  low: 1,
  medium: 2,
  high: 3,
  urgent: 3,
};

export function PriorityIcon({
  priority,
  className,
}: {
  priority: Priority;
  className?: string;
}) {
  const meta = PRIORITY_META[priority];

  return (
    <span
      title={`${meta.label} priority`}
      aria-label={`${meta.label} priority`}
      className={cn('inline-flex h-3.5 w-3.5 items-end justify-center gap-[2px]', meta.text, className)}
    >
      {priority === 'urgent' ? (
        <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="currentColor" aria-hidden="true">
          <rect x="2" y="2" width="12" height="12" rx="2" fillOpacity="0.18" />
          <rect x="4" y="4" width="8" height="8" rx="1.5" />
        </svg>
      ) : (
        [4, 7, 10].map((height, index) => (
          <span
            key={height}
            className={cn(
              'w-[3px] rounded-[1px] bg-current',
              index >= LEVELS[priority] && 'opacity-20',
            )}
            style={{ height }}
          />
        ))
      )}
    </span>
  );
}

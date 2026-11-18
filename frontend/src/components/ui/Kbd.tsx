import type { ReactNode } from 'react';
import { cn } from '../../lib/utils';

export function Kbd({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <kbd
      className={cn(
        'inline-flex h-[18px] min-w-[18px] items-center justify-center rounded border border-line bg-elevated px-1 font-sans text-[10px] font-medium leading-none text-subtle',
        className,
      )}
    >
      {children}
    </kbd>
  );
}

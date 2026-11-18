import { Check, ChevronDown } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '../../lib/utils';
import { Menu } from './Menu';

export interface SelectOption {
  value: string;
  label: string;
  icon?: ReactNode;
}

interface SelectMenuProps {
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  ariaLabel?: string;
  align?: 'start' | 'end';
  className?: string;
  triggerClassName?: string;
}

export function SelectMenu({
  value,
  options,
  onChange,
  placeholder = 'Select…',
  ariaLabel,
  align = 'start',
  className,
  triggerClassName,
}: SelectMenuProps) {
  const selected = options.find((option) => option.value === value);

  return (
    <Menu
      align={align}
      className={className}
      label={ariaLabel}
      trigger={({ open, toggle }) => (
        <button
          type="button"
          onClick={toggle}
          aria-label={ariaLabel}
          aria-haspopup="listbox"
          aria-expanded={open}
          className={cn(
            'flex w-full items-center justify-between gap-2 rounded-lg border border-line bg-surface px-2.5 py-1.5 text-left text-[13px] text-ink transition hover:border-line-strong hover:bg-elevated focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40',
            triggerClassName,
          )}
        >
          <span className="flex min-w-0 items-center gap-2">
            {selected?.icon}
            <span className="truncate">{selected?.label ?? placeholder}</span>
          </span>
          <ChevronDown
            className={cn(
              'h-3.5 w-3.5 shrink-0 text-subtle transition-transform duration-150',
              open && 'rotate-180',
            )}
          />
        </button>
      )}
    >
      {({ close }) => (
        <div role="listbox" aria-label={ariaLabel} className="max-h-64 overflow-y-auto">
          {options.map((option) => {
            const active = option.value === value;
            return (
              <button
                key={option.value}
                type="button"
                role="option"
                aria-selected={active}
                onClick={() => {
                  onChange(option.value);
                  close();
                }}
                className={cn(
                  'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[13px] text-muted transition hover:bg-zinc-500/10 hover:text-ink',
                  active && 'text-ink',
                )}
              >
                <span className="flex h-4 w-4 shrink-0 items-center justify-center">
                  {active && <Check className="h-3.5 w-3.5 text-brand-soft" />}
                </span>
                {option.icon && (
                  <span className="flex h-4 w-4 shrink-0 items-center justify-center">
                    {option.icon}
                  </span>
                )}
                <span className="flex-1 truncate">{option.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </Menu>
  );
}

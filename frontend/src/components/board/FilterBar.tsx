import { Check, ChevronDown, ListFilter, Tag, UserRound, X } from 'lucide-react';
import type { ReactNode } from 'react';
import { PRIORITIES, PRIORITY_META } from '../../lib/constants';
import { cn } from '../../lib/utils';
import { useBoardStore } from '../../store/useBoardStore';
import { Avatar } from '../ui/Avatar';
import { LabelPill } from '../ui/LabelPill';
import { Menu } from '../ui/Menu';
import { PriorityIcon } from '../ui/PriorityIcon';

function FilterTrigger({
  icon,
  label,
  count,
  open,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  count: number;
  open: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-haspopup="dialog"
      aria-expanded={open}
      className={cn(
        'inline-flex h-7 items-center gap-1.5 rounded-lg border px-2.5 text-[11px] font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40',
        count > 0
          ? 'border-brand/40 bg-brand/10 text-ink'
          : 'border-line bg-surface text-muted hover:bg-zinc-500/10 hover:text-ink',
      )}
    >
      {icon}
      <span>{label}</span>
      {count > 0 && (
        <span className="rounded bg-brand/20 px-1 text-[10px] font-semibold tabular-nums text-brand-soft">
          {count}
        </span>
      )}
      <ChevronDown
        className={cn('h-3 w-3 text-subtle transition-transform', open && 'rotate-180')}
      />
    </button>
  );
}

export function FilterBar({ visibleCount }: { visibleCount: number }) {
  const data = useBoardStore((state) => state.data);
  const filters = useBoardStore((state) => state.filters);
  const togglePriority = useBoardStore((state) => state.togglePriority);
  const toggleAssignee = useBoardStore((state) => state.toggleAssignee);
  const toggleLabel = useBoardStore((state) => state.toggleLabel);
  const clearFilters = useBoardStore((state) => state.clearFilters);

  if (!data) return null;

  const activeCount =
    filters.priority.length + filters.assigneeIds.length + filters.labelIds.length;
  const hasFilters = activeCount > 0 || filters.search.trim().length > 0;

  return (
    <div className="flex min-w-0 flex-wrap items-center gap-1.5">
      <Menu
        align="start"
        panelClassName="w-[212px]"
        label="Filter by priority"
        trigger={({ open, toggle }) => (
          <FilterTrigger
            icon={<ListFilter className="h-3.5 w-3.5" />}
            label="Priority"
            count={filters.priority.length}
            open={open}
            onClick={toggle}
          />
        )}
      >
        {({ close }) => (
          <div>
            <p className="px-2 pb-1 pt-1.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-subtle">
              Priority
            </p>
            {PRIORITIES.map((priority) => {
              const active = filters.priority.includes(priority);
              return (
                <button
                  key={priority}
                  type="button"
                  onClick={() => togglePriority(priority)}
                  className="menu-item justify-between"
                >
                  <span className="flex items-center gap-2">
                    <PriorityIcon priority={priority} />
                    <span>{PRIORITY_META[priority].label}</span>
                  </span>
                  {active && <Check className="h-3.5 w-3.5 text-brand-soft" />}
                </button>
              );
            })}
            {filters.priority.length > 0 && (
              <>
                <div className="my-1 h-px bg-line" />
                <button
                  type="button"
                  onClick={() => {
                    filters.priority.forEach((priority) => togglePriority(priority));
                    close();
                  }}
                  className="menu-item text-subtle"
                >
                  Clear priority
                </button>
              </>
            )}
          </div>
        )}
      </Menu>

      <Menu
        align="start"
        panelClassName="w-[232px]"
        label="Filter by assignee"
        trigger={({ open, toggle }) => (
          <FilterTrigger
            icon={<UserRound className="h-3.5 w-3.5" />}
            label="Assignee"
            count={filters.assigneeIds.length}
            open={open}
            onClick={toggle}
          />
        )}
      >
        {({ close }) => (
          <div className="max-h-[300px] overflow-y-auto">
            <p className="px-2 pb-1 pt-1.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-subtle">
              Assignee
            </p>
            {data.members.map((member) => {
              const active = filters.assigneeIds.includes(member.id);
              return (
                <button
                  key={member.id}
                  type="button"
                  onClick={() => toggleAssignee(member.id)}
                  className="menu-item justify-between"
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <Avatar user={member} size="xs" />
                    <span className="truncate">{member.name}</span>
                  </span>
                  {active && <Check className="h-3.5 w-3.5 text-brand-soft" />}
                </button>
              );
            })}
            {filters.assigneeIds.length > 0 && (
              <>
                <div className="my-1 h-px bg-line" />
                <button
                  type="button"
                  onClick={() => {
                    filters.assigneeIds.forEach((id) => toggleAssignee(id));
                    close();
                  }}
                  className="menu-item text-subtle"
                >
                  Clear assignees
                </button>
              </>
            )}
          </div>
        )}
      </Menu>

      <Menu
        align="start"
        panelClassName="w-[216px]"
        label="Filter by label"
        trigger={({ open, toggle }) => (
          <FilterTrigger
            icon={<Tag className="h-3.5 w-3.5" />}
            label="Label"
            count={filters.labelIds.length}
            open={open}
            onClick={toggle}
          />
        )}
      >
        {({ close }) => (
          <div>
            <p className="px-2 pb-1 pt-1.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-subtle">
              Label
            </p>
            {data.labels.map((label) => {
              const active = filters.labelIds.includes(label.id);
              return (
                <button
                  key={label.id}
                  type="button"
                  onClick={() => toggleLabel(label.id)}
                  className="menu-item justify-between gap-2"
                >
                  <LabelPill label={label} />
                  {active && <Check className="h-3.5 w-3.5 shrink-0 text-brand-soft" />}
                </button>
              );
            })}
            {filters.labelIds.length > 0 && (
              <>
                <div className="my-1 h-px bg-line" />
                <button
                  type="button"
                  onClick={() => {
                    filters.labelIds.forEach((id) => toggleLabel(id));
                    close();
                  }}
                  className="menu-item text-subtle"
                >
                  Clear labels
                </button>
              </>
            )}
          </div>
        )}
      </Menu>

      {hasFilters && (
        <button
          type="button"
          onClick={clearFilters}
          className="inline-flex h-7 items-center gap-1 rounded-lg px-2 text-[11px] font-medium text-subtle transition hover:bg-zinc-500/10 hover:text-ink"
        >
          <X className="h-3 w-3" />
          Clear
        </button>
      )}

      <span className="ml-auto hidden text-[11px] tabular-nums text-subtle sm:inline">
        {visibleCount} of {data.tasks.length} issues
      </span>
    </div>
  );
}

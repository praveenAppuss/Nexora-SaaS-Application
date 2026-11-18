import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Inbox, Plus } from 'lucide-react';
import type { Column, Label, Task, User } from '../../types';
import { STATUS_META } from '../../lib/constants';
import { totalStoryPoints } from '../../lib/tasks';
import { cn } from '../../lib/utils';
import { useBoardStore } from '../../store/useBoardStore';
import { useUiStore } from '../../store/useUiStore';
import { SortableTaskCard } from './TaskCard';

interface BoardColumnProps {
  column: Column;
  tasks: Task[];
  labels: Label[];
  members: User[];
  dropIndex: number | null;
  isDragging: boolean;
}

function DropPlaceholder() {
  return (
    <div className="flex h-[76px] items-center justify-center rounded-lg border border-dashed border-brand/50 bg-brand/[0.04]">
      <span className="text-[10px] font-medium text-brand dark:text-brand-soft">Drop here</span>
    </div>
  );
}

export function BoardColumn({
  column,
  tasks,
  labels,
  members,
  dropIndex,
  isDragging,
}: BoardColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: column.id,
    data: { type: 'column', status: column.id },
  });
  const openTask = useBoardStore((state) => state.openTask);
  const openNewIssue = useUiStore((state) => state.openNewIssue);
  const meta = STATUS_META[column.id];
  const points = totalStoryPoints(tasks);
  const showPlaceholder = dropIndex !== null;

  return (
    <section
      ref={setNodeRef}
      aria-label={`${column.name} column`}
      className={cn(
        'flex h-full w-[280px] shrink-0 flex-col rounded-xl border border-transparent px-1 pb-1 pt-1 transition-colors xl:w-auto xl:min-w-[230px] xl:flex-1',
        (isOver && isDragging) || showPlaceholder
          ? 'border-line-strong bg-zinc-500/[0.04]'
          : 'border-transparent',
      )}
    >
      <div className="flex items-center justify-between gap-2 px-1.5 pb-2 pt-1">
        <div className="flex min-w-0 items-center gap-2">
          <span className={cn('h-2 w-2 shrink-0 rounded-full', meta.dot)} />
          <h2 className="truncate text-[11px] font-semibold uppercase tracking-[0.04em] text-muted">
            {column.name}
          </h2>
          <span className="rounded bg-zinc-500/10 px-1.5 py-px text-[10px] font-medium tabular-nums text-subtle">
            {tasks.length}
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <span className="text-[10px] tabular-nums text-subtle">{points} pts</span>
          <button
            type="button"
            onClick={() => openNewIssue(column.id)}
            className="icon-button h-6 w-6"
            aria-label={`Add issue to ${column.name}`}
            title={`Add issue to ${column.name}`}
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto px-0.5 pb-6">
        <SortableContext
          items={tasks.map((task) => task.id)}
          strategy={verticalListSortingStrategy}
        >
          {tasks.map((task, index) => (
            <div key={task.id} className="flex flex-col gap-2">
              {showPlaceholder && dropIndex === index && <DropPlaceholder />}
              <SortableTaskCard
                task={task}
                labels={labels}
                assignee={members.find((member) => member.id === task.assigneeId)}
                onOpen={openTask}
              />
            </div>
          ))}
          {showPlaceholder && dropIndex !== null && dropIndex >= tasks.length && (
            <DropPlaceholder />
          )}
        </SortableContext>

        {tasks.length === 0 && !showPlaceholder && (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-line px-3 py-10 text-center">
            <Inbox className="h-4 w-4 text-subtle" />
            <p className="text-[11px] text-subtle">No issues here</p>
            <button
              type="button"
              onClick={() => openNewIssue(column.id)}
              className="text-[10px] font-medium text-brand-soft transition hover:text-ink"
            >
              Create one
            </button>
          </div>
        )}
      </div>
    </section>
  );
}

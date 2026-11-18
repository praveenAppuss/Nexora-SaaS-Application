import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { MessageSquare, UserRound } from 'lucide-react';
import type { Label, Task, User } from '../../types';
import { cn } from '../../lib/utils';
import { Avatar } from '../ui/Avatar';
import { LabelPill } from '../ui/LabelPill';
import { PriorityIcon } from '../ui/PriorityIcon';

interface TaskCardProps {
  task: Task;
  labels: Label[];
  assignee?: User;
  onOpen?: (taskId: string) => void;
  overlay?: boolean;
}

export function TaskCard({ task, labels, assignee, onOpen, overlay = false }: TaskCardProps) {
  const taskLabels = labels.filter((label) => task.labelIds.includes(label.id));

  return (
    <div
      onClick={onOpen ? () => onOpen(task.id) : undefined}
      className={cn(
        'group/card rounded-lg border border-line bg-surface px-3 py-2.5 shadow-card transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50',
        onOpen &&
          'cursor-pointer hover:border-line-strong hover:bg-elevated',
        overlay && 'cursor-grabbing shadow-lift ring-1 ring-brand/40',
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-[10px] font-medium tracking-tight text-subtle">
          {task.key}
        </span>
        <PriorityIcon priority={task.priority} />
      </div>

      <p className="mt-1.5 line-clamp-3 text-[12.5px] font-medium leading-[1.45] text-ink">
        {task.title}
      </p>

      {taskLabels.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {taskLabels.slice(0, 3).map((label) => (
            <LabelPill key={label.id} label={label} />
          ))}
          {taskLabels.length > 3 && (
            <span className="inline-flex items-center rounded-md border border-line px-1.5 py-[1px] text-[10px] text-subtle">
              +{taskLabels.length - 3}
            </span>
          )}
        </div>
      )}

      <div className="mt-2.5 flex items-center gap-1.5">
        <span
          title={`${task.storyPoints} story points`}
          className="inline-flex h-[18px] min-w-[18px] items-center justify-center rounded border border-line bg-bg px-1 font-mono text-[9px] font-medium text-muted"
        >
          {task.storyPoints}
        </span>
        {task.comments.length > 0 && (
          <span
            className="flex items-center gap-0.5 text-[9px] text-subtle"
            title={`${task.comments.length} comments`}
          >
            <MessageSquare className="h-2.5 w-2.5" />
            {task.comments.length}
          </span>
        )}
        <div className="ml-auto" title={assignee ? assignee.name : 'Unassigned'}>
          {assignee ? (
            <Avatar user={assignee} size="xs" />
          ) : (
            <span className="grid h-5 w-5 place-items-center rounded-full border border-dashed border-line-strong text-subtle">
              <UserRound className="h-2.5 w-2.5" />
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export function SortableTaskCard({
  task,
  labels,
  assignee,
  onOpen,
}: {
  task: Task;
  labels: Label[];
  assignee?: User;
  onOpen: (taskId: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
    data: { type: 'task', task },
  });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Translate.toString(transform),
        transition,
      }}
      {...attributes}
      {...listeners}
      aria-label={`${task.key}: ${task.title}`}
      className={cn('touch-none outline-none', isDragging && 'opacity-30')}
    >
      <TaskCard task={task} labels={labels} assignee={assignee} onOpen={onOpen} />
    </div>
  );
}

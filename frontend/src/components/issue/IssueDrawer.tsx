import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { Priority, TaskStatus } from '../../types';
import {
  PRIORITIES,
  PRIORITY_META,
  STATUS_META,
  TASK_STATUSES,
} from '../../lib/constants';
import { formatRelativeTime } from '../../lib/utils';
import { useBoardStore } from '../../store/useBoardStore';
import { useUiStore } from '../../store/useUiStore';
import { Avatar } from '../ui/Avatar';
import { LabelPill } from '../ui/LabelPill';
import { PriorityIcon } from '../ui/PriorityIcon';
import { SelectMenu } from '../ui/SelectMenu';
import { StatusDot } from '../ui/StatusDot';
import { ActivityFeed } from './ActivityFeed';
import { DescriptionEditor } from './DescriptionEditor';

export function IssueDrawer() {
  const data = useBoardStore((state) => state.data);
  const openTaskId = useBoardStore((state) => state.openTaskId);
  const closeTask = useBoardStore((state) => state.closeTask);
  const updateTask = useBoardStore((state) => state.updateTask);
  const moveTask = useBoardStore((state) => state.moveTask);

  const task = data?.tasks.find((item) => item.id === openTaskId) ?? null;

  const [title, setTitle] = useState('');
  const [points, setPoints] = useState(0);
  const titleRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!task) return;
    setTitle(task.title);
    setPoints(task.storyPoints);
  }, [task?.id]);

  useEffect(() => {
    if (!task) return;
    const textarea = titleRef.current;
    if (!textarea) return;
    textarea.style.height = 'auto';
    textarea.style.height = `${textarea.scrollHeight}px`;
  }, [title, task]);

  useEffect(() => {
    if (!task) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      if (useUiStore.getState().commandOpen || useUiStore.getState().newIssueOpen) return;
      if (document.querySelector('[aria-expanded="true"][aria-haspopup]')) return;
      closeTask();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [task, closeTask]);

  const saveTitle = () => {
    if (!task) return;
    const next = title.trim();
    if (!next) {
      setTitle(task.title);
      return;
    }
    if (next !== task.title) {
      void updateTask(task.id, { title: next });
    }
  };

  const savePoints = () => {
    if (!task) return;
    const next = Math.max(0, Math.round(Number(points) || 0));
    setPoints(next);
    if (next !== task.storyPoints) {
      void updateTask(task.id, { storyPoints: next });
    }
  };

  const changeStatus = (next: TaskStatus) => {
    if (!task || !data || next === task.status) return;
    const targetIndex = data.tasks.filter(
      (item) => item.status === next && item.id !== task.id,
    ).length;
    void moveTask(task.id, next, targetIndex);
  };

  const toggleLabel = (labelId: string) => {
    if (!task) return;
    const labelIds = task.labelIds.includes(labelId)
      ? task.labelIds.filter((id) => id !== labelId)
      : [...task.labelIds, labelId];
    void updateTask(task.id, { labelIds });
  };

  return (
    <AnimatePresence>
      {task && data && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-black/55 backdrop-blur-[1.5px]"
            onClick={closeTask}
          />

          <motion.aside
            role="dialog"
            aria-modal="true"
            aria-label={`Issue ${task.key}: ${task.title}`}
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 340, damping: 38 }}
            className="relative flex h-full w-full flex-col border-l border-line bg-surface shadow-2xl sm:max-w-[560px]"
          >
            <div className="flex h-[48px] shrink-0 items-center justify-between gap-3 border-b border-line px-4">
              <div className="flex min-w-0 items-center gap-2 text-[10px] text-subtle">
                <StatusDot status={task.status} />
                <span className="font-mono font-medium text-muted">{task.key}</span>
                <span className="text-line-strong">/</span>
                <span className="truncate">{data.workspace.name}</span>
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                <span className="hidden text-[10px] text-subtle sm:inline">
                  Updated {formatRelativeTime(task.updatedAt)}
                </span>
                <button
                  type="button"
                  onClick={closeTask}
                  className="icon-button"
                  aria-label="Close issue"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto">
              <div className="px-5 pb-6 pt-4">
                <textarea
                  ref={titleRef}
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  onBlur={saveTitle}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault();
                      event.currentTarget.blur();
                    }
                    if (event.key === 'Escape') {
                      setTitle(task.title);
                      event.currentTarget.blur();
                    }
                  }}
                  rows={2}
                  placeholder="Issue title"
                  aria-label="Issue title"
                  className="w-full resize-none overflow-hidden bg-transparent font-display text-[20px] font-semibold leading-[1.25] tracking-[-0.02em] text-ink outline-none placeholder:text-subtle"
                />

                <div className="mt-5 grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2">
                  <div>
                    <p className="field-label">Status</p>
                    <SelectMenu
                      value={task.status}
                      ariaLabel="Issue status"
                      options={TASK_STATUSES.map((status) => ({
                        value: status,
                        label: STATUS_META[status].label,
                        icon: <StatusDot status={status} />,
                      }))}
                      onChange={(value) => changeStatus(value as TaskStatus)}
                    />
                  </div>

                  <div>
                    <p className="field-label">Priority</p>
                    <SelectMenu
                      value={task.priority}
                      ariaLabel="Issue priority"
                      options={PRIORITIES.map((priority) => ({
                        value: priority,
                        label: PRIORITY_META[priority].label,
                        icon: <PriorityIcon priority={priority} />,
                      }))}
                      onChange={(value) =>
                        void updateTask(task.id, { priority: value as Priority })
                      }
                    />
                  </div>

                  <div>
                    <p className="field-label">Assignee</p>
                    <SelectMenu
                      value={task.assigneeId ?? 'unassigned'}
                      ariaLabel="Issue assignee"
                      options={[
                        { value: 'unassigned', label: 'Unassigned' },
                        ...data.members.map((member) => ({
                          value: member.id,
                          label: member.name,
                          icon: <Avatar user={member} size="xs" />,
                        })),
                      ]}
                      onChange={(value) =>
                        void updateTask(task.id, {
                          assigneeId: value === 'unassigned' ? null : value,
                        })
                      }
                    />
                  </div>

                  <div>
                    <label htmlFor="drawer-story-points" className="field-label">
                      Story points
                    </label>
                    <input
                      id="drawer-story-points"
                      type="number"
                      min={0}
                      max={40}
                      value={points}
                      onChange={(event) => setPoints(Number(event.target.value))}
                      onBlur={savePoints}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') event.currentTarget.blur();
                      }}
                      className="field h-[34px] py-0"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <p className="field-label">Labels</p>
                    <div className="flex flex-wrap gap-1.5">
                      {data.labels.map((label) => {
                        const active = task.labelIds.includes(label.id);
                        return (
                          <button
                            key={label.id}
                            type="button"
                            aria-pressed={active}
                            onClick={() => toggleLabel(label.id)}
                            className={`rounded-md border border-transparent p-0.5 transition hover:border-line ${
                              active ? '' : 'opacity-40 hover:opacity-80'
                            }`}
                          >
                            <LabelPill label={label} />
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className="mt-6">
                  <div className="mb-2 flex items-center justify-between">
                    <h3 className="text-[10px] font-semibold uppercase tracking-[0.08em] text-subtle">
                      Description
                    </h3>
                    <span className="text-[9px] text-subtle">Markdown supported</span>
                  </div>
                  <DescriptionEditor
                    value={task.description}
                    onSave={async (next) => {
                      await updateTask(task.id, { description: next });
                    }}
                  />
                </div>

                <div className="mt-6 flex items-center gap-4 border-t border-line pt-3 text-[10px] text-subtle">
                  <span>Created {formatRelativeTime(task.createdAt)}</span>
                  <span>{task.comments.length} comments</span>
                  <span className="ml-auto font-mono">{task.key}</span>
                </div>
              </div>

              <div className="border-t border-line px-5 py-5">
                <ActivityFeed task={task} />
              </div>
            </div>
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  );
}

import { AnimatePresence, motion } from 'framer-motion';
import { Loader2, Plus, X } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import type { Label, Priority, TaskStatus } from '../../types';
import { PRIORITIES, PRIORITY_META, STATUS_META, TASK_STATUSES } from '../../lib/constants';
import { cn } from '../../lib/utils';
import { useAuthStore } from '../../store/useAuthStore';
import { useBoardStore } from '../../store/useBoardStore';
import { useUiStore } from '../../store/useUiStore';
import { Avatar } from '../ui/Avatar';
import { Kbd } from '../ui/Kbd';
import { LabelPill } from '../ui/LabelPill';
import { PriorityIcon } from '../ui/PriorityIcon';
import { SelectMenu } from '../ui/SelectMenu';
import { StatusDot } from '../ui/StatusDot';

export function NewIssueModal() {
  const isOpen = useUiStore((state) => state.newIssueOpen);
  const defaultStatus = useUiStore((state) => state.newIssueStatus);
  const closeNewIssue = useUiStore((state) => state.closeNewIssue);
  const data = useBoardStore((state) => state.data);
  const createTask = useBoardStore((state) => state.createTask);
  const session = useAuthStore((state) => state.session);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<TaskStatus>('todo');
  const [priority, setPriority] = useState<Priority>('medium');
  const [assigneeId, setAssigneeId] = useState<string>('unassigned');
  const [storyPoints, setStoryPoints] = useState(3);
  const [labelIds, setLabelIds] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setTitle('');
    setDescription('');
    setStatus(defaultStatus);
    setPriority('medium');
    setAssigneeId(session?.user.id ?? 'unassigned');
    setStoryPoints(3);
    setLabelIds([]);
    setSubmitting(false);
    setError(null);
  }, [isOpen, defaultStatus, session?.user.id]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeNewIssue();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, closeNewIssue]);

  const members = data?.members ?? [];
  const labels = data?.labels ?? [];

  const toggleLabel = (label: Label) => {
    setLabelIds((current) =>
      current.includes(label.id)
        ? current.filter((id) => id !== label.id)
        : [...current, label.id],
    );
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!title.trim() || submitting) return;

    setSubmitting(true);
    setError(null);
    try {
      await createTask({
        title: title.trim(),
        description: description.trim(),
        status,
        priority,
        storyPoints,
        assigneeId: assigneeId === 'unassigned' ? null : assigneeId,
        labelIds,
        sprintId: data?.sprint.id,
      });
      closeNewIssue();
    } catch (submitError) {
      setError(
        submitError instanceof Error ? submitError.message : 'The issue could not be created.',
      );
      setSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && data && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-[2px]"
            onClick={closeNewIssue}
          />

          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="new-issue-title"
            className="relative flex max-h-[90dvh] w-full max-w-[520px] flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-panel"
          >
            <div className="flex items-start justify-between gap-3 border-b border-line px-5 py-4">
              <div>
                <div className="flex items-center gap-1.5 text-[10px] text-subtle">
                  <span>{data.workspace.name}</span>
                  <span className="text-line-strong">/</span>
                  <span>{data.sprint.name}</span>
                </div>
                <h2
                  id="new-issue-title"
                  className="mt-1 font-display text-[17px] font-semibold tracking-[-0.01em] text-ink"
                >
                  New issue
                </h2>
              </div>
              <button
                type="button"
                onClick={closeNewIssue}
                className="icon-button"
                aria-label="Close new issue dialog"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
              <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4">
                <div>
                  <label htmlFor="issue-title" className="field-label">
                    Title
                  </label>
                  <input
                    id="issue-title"
                    autoFocus
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                    placeholder="What needs to be done?"
                    className="field h-10 text-[14px]"
                    maxLength={160}
                  />
                </div>

                <div>
                  <label htmlFor="issue-description" className="field-label">
                    Description
                  </label>
                  <textarea
                    id="issue-description"
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                    placeholder="Add context, acceptance criteria, or links…"
                    rows={3}
                    className="field resize-none leading-relaxed"
                  />
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <p className="field-label">Status</p>
                    <SelectMenu
                      value={status}
                      ariaLabel="Issue status"
                      options={TASK_STATUSES.map((item) => ({
                        value: item,
                        label: STATUS_META[item].label,
                        icon: <StatusDot status={item} />,
                      }))}
                      onChange={(value) => setStatus(value as TaskStatus)}
                    />
                  </div>
                  <div>
                    <p className="field-label">Priority</p>
                    <SelectMenu
                      value={priority}
                      ariaLabel="Issue priority"
                      options={PRIORITIES.map((item) => ({
                        value: item,
                        label: PRIORITY_META[item].label,
                        icon: <PriorityIcon priority={item} />,
                      }))}
                      onChange={(value) => setPriority(value as Priority)}
                    />
                  </div>
                  <div>
                    <p className="field-label">Assignee</p>
                    <SelectMenu
                      value={assigneeId}
                      ariaLabel="Issue assignee"
                      options={[
                        { value: 'unassigned', label: 'Unassigned' },
                        ...members.map((member) => ({
                          value: member.id,
                          label: member.name,
                          icon: <Avatar user={member} size="xs" />,
                        })),
                      ]}
                      onChange={setAssigneeId}
                    />
                  </div>
                  <div>
                    <label htmlFor="issue-points" className="field-label">
                      Story points
                    </label>
                    <input
                      id="issue-points"
                      type="number"
                      min={0}
                      max={40}
                      value={storyPoints}
                      onChange={(event) =>
                        setStoryPoints(Math.max(0, Number(event.target.value) || 0))
                      }
                      className="field h-[34px] py-0"
                    />
                  </div>
                </div>

                <div>
                  <p className="field-label">Labels</p>
                  <div className="flex flex-wrap gap-1.5">
                    {labels.map((label) => {
                      const active = labelIds.includes(label.id);
                      return (
                        <button
                          key={label.id}
                          type="button"
                          aria-pressed={active}
                          onClick={() => toggleLabel(label)}
                          className={cn(
                            'rounded-md border border-transparent p-0.5 transition hover:border-line',
                            !active && 'opacity-45 hover:opacity-90',
                          )}
                        >
                          <LabelPill label={label} />
                        </button>
                      );
                    })}
                  </div>
                </div>

                {error && (
                  <p
                    role="alert"
                    className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-[11px] text-red-600 dark:text-red-300"
                  >
                    {error}
                  </p>
                )}
              </div>

              <div className="flex items-center justify-between gap-3 border-t border-line px-5 py-3">
                <span className="hidden items-center gap-1 text-[10px] text-subtle sm:flex">
                  <Kbd>esc</Kbd> to cancel
                </span>
                <div className="ml-auto flex items-center gap-2">
                  <button
                    type="button"
                    onClick={closeNewIssue}
                    className="btn-secondary h-8"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!title.trim() || submitting}
                    className="btn-primary h-8"
                  >
                    {submitting ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Plus className="h-3.5 w-3.5" />
                    )}
                    Create issue
                  </button>
                </div>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

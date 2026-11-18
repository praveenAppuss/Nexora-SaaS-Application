import { CornerDownLeft, Loader2, Send } from 'lucide-react';
import { useMemo, useState, type KeyboardEvent } from 'react';
import type { Activity, Comment, Task, User } from '../../types';
import { formatRelativeTime, isMacPlatform } from '../../lib/utils';
import { useAuthStore } from '../../store/useAuthStore';
import { useBoardStore } from '../../store/useBoardStore';
import { Avatar } from '../ui/Avatar';

type FeedEntry =
  | {
      id: string;
      kind: 'activity';
      author: User;
      message: string;
      createdAt: string;
      activityType: Activity['type'];
    }
  | {
      id: string;
      kind: 'comment';
      author: User;
      body: string;
      createdAt: string;
    };

export function ActivityFeed({ task }: { task: Task }) {
  const data = useBoardStore((state) => state.data);
  const addComment = useBoardStore((state) => state.addComment);
  const session = useAuthStore((state) => state.session);

  const [body, setBody] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const entries = useMemo<FeedEntry[]>(() => {
    const activities: FeedEntry[] = task.activity.map((activity) => ({
      id: activity.id,
      kind: 'activity',
      author: activity.actor,
      message: activity.message,
      createdAt: activity.createdAt,
      activityType: activity.type,
    }));
    const comments: FeedEntry[] = task.comments.map((comment: Comment) => ({
      id: comment.id,
      kind: 'comment',
      author: comment.author,
      body: comment.body,
      createdAt: comment.createdAt,
    }));

    return [...activities, ...comments].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );
  }, [task.activity, task.comments]);

  const members = data?.members ?? [];
  const currentUser =
    members.find((member) => member.id === session?.user.id) ?? members[0];

  const submit = async () => {
    const text = body.trim();
    if (!text || submitting) return;

    setSubmitting(true);
    setError(null);
    const comment = await addComment(task.id, text);
    setSubmitting(false);

    if (comment) {
      setBody('');
    } else {
      setError('Your comment could not be posted. Please try again.');
    }
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
      event.preventDefault();
      void submit();
    }
  };

  return (
    <section aria-label="Activity and comments">
      <div className="mb-3 flex items-center gap-2">
        <h3 className="text-[10px] font-semibold uppercase tracking-[0.08em] text-subtle">
          Activity &amp; comments
        </h3>
        <span className="rounded bg-zinc-500/10 px-1.5 py-px text-[9px] tabular-nums text-subtle">
          {entries.length}
        </span>
      </div>

      <div className="space-y-4">
        {entries.length === 0 && (
          <p className="text-[11px] text-subtle">
            No activity yet. Comment below to start the thread.
          </p>
        )}

        {entries.map((entry) => (
          <div key={entry.id} className="flex gap-2.5">
            <Avatar user={entry.author} size="sm" className="mt-0.5" />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5">
                <span className="text-[11.5px] font-medium text-ink">
                  {entry.author.name}
                </span>
                {entry.kind === 'activity' ? (
                  <span className="text-[11px] text-muted">{entry.message}</span>
                ) : (
                  <span className="text-[10px] text-subtle">commented</span>
                )}
                <span className="text-[9.5px] text-subtle">
                  · {formatRelativeTime(entry.createdAt)}
                </span>
              </div>

              {entry.kind === 'comment' && (
                <div className="mt-1.5 whitespace-pre-wrap break-words rounded-lg border border-line bg-bg px-2.5 py-2 text-[12px] leading-relaxed text-muted">
                  {entry.body}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-5 rounded-xl border border-line bg-bg p-2.5">
        <div className="flex gap-2.5">
          {currentUser && <Avatar user={currentUser} size="sm" className="mt-0.5" />}
          <textarea
            value={body}
            onChange={(event) => {
              setBody(event.target.value);
              if (error) setError(null);
            }}
            onKeyDown={handleKeyDown}
            rows={2}
            placeholder="Leave a comment…"
            aria-label="Write a comment"
            className="min-h-[42px] flex-1 resize-none bg-transparent text-[12px] leading-relaxed text-ink outline-none placeholder:text-subtle"
          />
        </div>

        <div className="mt-1 flex items-center justify-between gap-2 pl-[34px]">
          <span className="flex items-center gap-1 text-[9px] text-subtle">
            <CornerDownLeft className="h-2.5 w-2.5" />
            {isMacPlatform ? '⌘' : 'Ctrl'} + ↵ to send
          </span>
          <button
            type="button"
            onClick={() => void submit()}
            disabled={!body.trim() || submitting}
            className="btn-primary h-7 px-2.5 text-[11px]"
          >
            {submitting ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Send className="h-3 w-3" />
            )}
            Comment
          </button>
        </div>

        {error && (
          <p
            role="alert"
            className="mt-2 rounded-md border border-red-500/20 bg-red-500/10 px-2 py-1.5 text-[10px] text-red-600 dark:text-red-300"
          >
            {error}
          </p>
        )}
      </div>
    </section>
  );
}

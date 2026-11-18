import { Bold, Italic, List, Loader2, Pencil } from 'lucide-react';
import {
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';

function renderInline(text: string): ReactNode[] {
  const tokens = text
    .split(/(\*\*[^*]+\*\*|`[^`]+`|_[^_]+_)/g)
    .filter((token) => token.length > 0);

  return tokens.map((token, index) => {
    if (token.startsWith('**') && token.endsWith('**') && token.length > 4) {
      return (
        <strong key={index} className="font-semibold text-ink">
          {token.slice(2, -2)}
        </strong>
      );
    }
    if (token.startsWith('`') && token.endsWith('`') && token.length > 2) {
      return (
        <code
          key={index}
          className="rounded bg-zinc-500/10 px-1 py-px font-mono text-[11px] text-ink"
        >
          {token.slice(1, -1)}
        </code>
      );
    }
    if (token.startsWith('_') && token.endsWith('_') && token.length > 2) {
      return <em key={index}>{token.slice(1, -1)}</em>;
    }
    return <span key={index}>{token}</span>;
  });
}

export function RichDescription({ value }: { value: string }) {
  if (!value.trim()) {
    return <p className="text-[12px] italic text-subtle">Add a description…</p>;
  }

  return (
    <div className="space-y-1.5 text-[12.5px] leading-relaxed text-muted">
      {value.split('\n').map((line, index) => {
        const trimmed = line.trim();
        if (!trimmed) return <div key={index} className="h-1" />;

        if (trimmed.startsWith('- ')) {
          return (
            <div key={index} className="flex gap-2 pl-1">
              <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-subtle" />
              <p className="min-w-0">{renderInline(trimmed.slice(2))}</p>
            </div>
          );
        }

        const numbered = /^(\d+)\.\s(.*)$/.exec(trimmed);
        if (numbered) {
          return (
            <div key={index} className="flex gap-2 pl-1">
              <span className="w-3 shrink-0 text-right text-[11px] tabular-nums text-subtle">
                {numbered[1]}.
              </span>
              <p className="min-w-0">{renderInline(numbered[2])}</p>
            </div>
          );
        }

        return <p key={index}>{renderInline(trimmed)}</p>;
      })}
    </div>
  );
}

export function DescriptionEditor({
  value,
  onSave,
}: {
  value: string;
  onSave: (next: string) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [saving, setSaving] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setDraft(value);
    setEditing(false);
  }, [value]);

  const beginEditing = () => {
    setDraft(value);
    setEditing(true);
    window.setTimeout(() => {
      const textarea = textareaRef.current;
      if (!textarea) return;
      textarea.focus();
      textarea.setSelectionRange(textarea.value.length, textarea.value.length);
    }, 0);
  };

  const cancel = () => {
    setDraft(value);
    setEditing(false);
  };

  const save = async () => {
    if (saving) return;
    if (draft === value) {
      setEditing(false);
      return;
    }
    setSaving(true);
    try {
      await onSave(draft);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  const wrapSelection = (before: string, after: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const next = `${draft.slice(0, start)}${before}${draft.slice(start, end)}${after}${draft.slice(end)}`;
    setDraft(next);
    requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(start + before.length, end + before.length);
    });
  };

  const prefixBullet = () => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const lineStart = draft.lastIndexOf('\n', start - 1) + 1;
    setDraft(`${draft.slice(0, lineStart)}- ${draft.slice(lineStart)}`);
    requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(start + 2, start + 2);
    });
  };

  if (!editing) {
    return (
      <button
        type="button"
        onClick={beginEditing}
        className="group/desc -m-2 w-[calc(100%+1rem)] rounded-lg border border-transparent p-2 text-left transition hover:border-line hover:bg-zinc-500/[0.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
      >
        <RichDescription value={value} />
        <span className="mt-2 flex items-center gap-1 text-[9px] text-subtle opacity-0 transition group-hover/desc:opacity-100">
          <Pencil className="h-2.5 w-2.5" />
          Click to edit
        </span>
      </button>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-line bg-bg">
      <div className="flex items-center gap-0.5 border-b border-line px-1.5 py-1">
        <button
          type="button"
          onClick={() => wrapSelection('**', '**')}
          className="icon-button h-6 w-6"
          aria-label="Bold"
          title="Bold"
        >
          <Bold className="h-3 w-3" />
        </button>
        <button
          type="button"
          onClick={() => wrapSelection('_', '_')}
          className="icon-button h-6 w-6"
          aria-label="Italic"
          title="Italic"
        >
          <Italic className="h-3 w-3" />
        </button>
        <button
          type="button"
          onClick={prefixBullet}
          className="icon-button h-6 w-6"
          aria-label="Bullet list"
          title="Bullet list"
        >
          <List className="h-3 w-3" />
        </button>
        <span className="ml-auto pr-1 text-[9px] text-subtle">Markdown</span>
      </div>

      <textarea
        ref={textareaRef}
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        rows={6}
        placeholder="Describe the work, acceptance criteria, or context…"
        className="w-full resize-y bg-transparent px-3 py-2 text-[12.5px] leading-relaxed text-ink outline-none placeholder:text-subtle"
        onKeyDown={(event) => {
          if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
            event.preventDefault();
            void save();
          }
          if (event.key === 'Escape') {
            event.preventDefault();
            cancel();
          }
        }}
      />

      <div className="flex items-center justify-between gap-2 border-t border-line px-2 py-1.5">
        <span className="text-[9px] text-subtle">
          <kbd className="font-sans">⌘</kbd> + <kbd className="font-sans">↵</kbd> to save
        </span>
        <div className="flex items-center gap-1.5">
          <button type="button" onClick={cancel} className="btn-ghost h-7 text-[11px]">
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void save()}
            disabled={saving}
            className="btn-primary h-7 px-2.5 text-[11px]"
          >
            {saving && <Loader2 className="h-3 w-3 animate-spin" />}
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

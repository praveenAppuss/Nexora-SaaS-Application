import { Command } from 'cmdk';
import { AnimatePresence, motion } from 'framer-motion';
import {
  LogOut,
  MoonStar,
  Plus,
  Search,
  Sparkles,
  SquareCheckBig,
  XCircle,
} from 'lucide-react';
import { useEffect } from 'react';
import { PRIORITIES, PRIORITY_META } from '../../lib/constants';
import { useAuthStore } from '../../store/useAuthStore';
import { useBoardStore } from '../../store/useBoardStore';
import { useUiStore } from '../../store/useUiStore';
import { Kbd } from '../ui/Kbd';
import { PriorityIcon } from '../ui/PriorityIcon';
import { StatusDot } from '../ui/StatusDot';

export function CommandPalette() {
  const open = useUiStore((state) => state.commandOpen);
  const setCommandOpen = useUiStore((state) => state.setCommandOpen);
  const toggleTheme = useUiStore((state) => state.toggleTheme);
  const openNewIssue = useUiStore((state) => state.openNewIssue);

  const data = useBoardStore((state) => state.data);
  const openTask = useBoardStore((state) => state.openTask);
  const closeTask = useBoardStore((state) => state.closeTask);
  const setPriorityFilter = useBoardStore((state) => state.setPriorityFilter);
  const clearFilters = useBoardStore((state) => state.clearFilters);
  const resetBoard = useBoardStore((state) => state.resetBoard);

  const session = useAuthStore((state) => state.session);
  const logout = useAuthStore((state) => state.logout);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setCommandOpen(false);
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, setCommandOpen]);

  const tasks = data?.tasks ?? [];

  const handleLogout = () => {
    setCommandOpen(false);
    closeTask();
    resetBoard();
    void logout();
  };

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[70] flex items-start justify-center px-4 pt-[9vh] sm:pt-[13vh]">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-[2px]"
            onClick={() => setCommandOpen(false)}
          />

          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.985 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.985 }}
            transition={{ duration: 0.16, ease: 'easeOut' }}
            role="dialog"
            aria-modal="true"
            aria-label="Command palette"
            className="relative w-full max-w-[560px] overflow-hidden rounded-xl border border-line bg-elevated shadow-panel"
          >
            <Command label="Command palette" loop className="command-palette">
              <div className="flex items-center gap-2.5 border-b border-line px-3">
                <Search className="h-4 w-4 shrink-0 text-subtle" />
                <Command.Input
                  autoFocus
                  placeholder="Search issues or run a command…"
                  className="h-11 w-full bg-transparent text-[13px] text-ink outline-none placeholder:text-subtle"
                />
                <Kbd>esc</Kbd>
              </div>

              <Command.List className="max-h-[min(56vh,430px)] overflow-y-auto p-2">
                <Command.Empty className="py-10 text-center text-[12px] text-subtle">
                  No issues or commands found.
                </Command.Empty>

                <Command.Group heading="Issues">
                  {tasks.map((task) => (
                    <Command.Item
                      key={task.id}
                      value={`${task.key} ${task.title}`}
                      keywords={[task.key, task.title]}
                      onSelect={() => {
                        openTask(task.id);
                        setCommandOpen(false);
                      }}
                    >
                      <StatusDot status={task.status} />
                      <span className="min-w-0 flex-1 truncate">{task.title}</span>
                      <span className="shrink-0 font-mono text-[10px] text-subtle">
                        {task.key}
                      </span>
                      <PriorityIcon priority={task.priority} />
                    </Command.Item>
                  ))}
                </Command.Group>

                <Command.Group heading="Actions">
                  <Command.Item
                    value="create new issue"
                    onSelect={() => {
                      setCommandOpen(false);
                      openNewIssue('todo');
                    }}
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span className="flex-1">Create a new issue</span>
                    <span className="text-[10px] text-subtle">NEX</span>
                  </Command.Item>
                  <Command.Item
                    value="toggle theme dark light appearance"
                    onSelect={() => {
                      toggleTheme();
                      setCommandOpen(false);
                    }}
                  >
                    <MoonStar className="h-3.5 w-3.5" />
                    <span className="flex-1">Toggle dark / light theme</span>
                    <Sparkles className="h-3 w-3 text-subtle" />
                  </Command.Item>
                  <Command.Item
                    value="clear board filters reset"
                    onSelect={() => {
                      clearFilters();
                      setCommandOpen(false);
                    }}
                  >
                    <XCircle className="h-3.5 w-3.5" />
                    <span className="flex-1">Clear board filters</span>
                  </Command.Item>
                  <Command.Item
                    value="show my issues assigned to me"
                    onSelect={() => {
                      if (session) {
                        useBoardStore
                          .getState()
                          .applyQuickFilter('mine', session.user.id);
                      }
                      setCommandOpen(false);
                    }}
                  >
                    <SquareCheckBig className="h-3.5 w-3.5" />
                    <span className="flex-1">Show my issues</span>
                  </Command.Item>
                </Command.Group>

                <Command.Group heading="Filter by priority">
                  {PRIORITIES.filter((priority) => priority !== 'none').map((priority) => (
                    <Command.Item
                      key={priority}
                      value={`filter by priority ${PRIORITY_META[priority].label}`}
                      keywords={['filter', 'priority', PRIORITY_META[priority].label]}
                      onSelect={() => {
                        setPriorityFilter([priority]);
                        setCommandOpen(false);
                      }}
                    >
                      <PriorityIcon priority={priority} />
                      <span className="flex-1">
                        Show {PRIORITY_META[priority].label.toLowerCase()} priority
                      </span>
                    </Command.Item>
                  ))}
                </Command.Group>

                <Command.Group heading="Workspace">
                  <Command.Item
                    value="log out sign out"
                    onSelect={handleLogout}
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    <span className="flex-1">Log out</span>
                    {session?.isDemo && (
                      <span className="text-[10px] text-subtle">Recruiter sandbox</span>
                    )}
                  </Command.Item>
                </Command.Group>
              </Command.List>

              <div className="flex items-center justify-between gap-2 border-t border-line px-3 py-2 text-[10px] text-subtle">
                <span className="flex items-center gap-2.5">
                  <span className="flex items-center gap-1">
                    <Kbd>↑</Kbd>
                    <Kbd>↓</Kbd>
                    navigate
                  </span>
                  <span className="flex items-center gap-1">
                    <Kbd>↵</Kbd>
                    select
                  </span>
                </span>
                <span>{tasks.length} issues</span>
              </div>
            </Command>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

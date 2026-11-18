import { AlertCircle, X } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { useEffect } from 'react';
import { Board } from '../components/board/Board';
import { CommandPalette } from '../components/command/CommandPalette';
import { NewIssueModal } from '../components/issue/NewIssueModal';
import { IssueDrawer } from '../components/issue/IssueDrawer';
import { Header } from '../components/layout/Header';
import { MobileSidebar, Sidebar } from '../components/layout/Sidebar';
import { useGlobalShortcuts } from '../hooks/useGlobalShortcuts';
import { useBoardStore } from '../store/useBoardStore';

function BoardSkeleton() {
  return (
    <div className="flex min-h-0 flex-1 gap-3 overflow-hidden px-4 py-4 lg:px-6">
      {Array.from({ length: 5 }).map((_, columnIndex) => (
        <div
          key={columnIndex}
          className="flex min-w-[264px] flex-1 flex-col gap-2 rounded-xl border border-line bg-surface/60 p-2"
        >
          <div className="flex items-center gap-2 px-1 py-1.5">
            <div className="skeleton h-2 w-2 rounded-full" />
            <div className="skeleton h-3 w-20" />
            <div className="skeleton ml-auto h-3 w-8" />
          </div>
          {Array.from({ length: columnIndex === 0 ? 3 : 2 }).map((__, cardIndex) => (
            <div
              key={cardIndex}
              className="rounded-lg border border-line bg-surface p-3"
            >
              <div className="skeleton h-2.5 w-14" />
              <div className="skeleton mt-2.5 h-3 w-full" />
              <div className="skeleton mt-1.5 h-3 w-3/4" />
              <div className="mt-3 flex gap-1.5">
                <div className="skeleton h-4 w-14 rounded" />
                <div className="skeleton h-4 w-10 rounded" />
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

function EmptyBoard() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-2 px-6 text-center">
      <p className="font-display text-sm font-medium text-ink">No board available</p>
      <p className="max-w-sm text-[12px] text-subtle">
        The workspace data could not be loaded. Try reloading the page.
      </p>
    </div>
  );
}

export default function WorkspacePage() {
  const loadBoard = useBoardStore((state) => state.loadBoard);
  const data = useBoardStore((state) => state.data);
  const isLoading = useBoardStore((state) => state.isLoading);
  const error = useBoardStore((state) => state.error);
  const dismissError = useBoardStore((state) => state.dismissError);

  useGlobalShortcuts();

  useEffect(() => {
    void loadBoard();
  }, [loadBoard]);

  useEffect(() => {
    if (!error) return;
    const timeout = window.setTimeout(dismissError, 6000);
    return () => window.clearTimeout(timeout);
  }, [error, dismissError]);

  return (
    <div className="flex h-dvh overflow-hidden bg-bg text-ink">
      <Sidebar />
      <MobileSidebar />

      <div className="flex min-w-0 flex-1 flex-col">
        <Header />
        <main className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
          {data ? <Board /> : isLoading ? <BoardSkeleton /> : <EmptyBoard />}
          {isLoading && data && (
            <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-[2px] overflow-hidden bg-brand/10">
              <motion.div
                className="h-full w-1/4 bg-brand"
                initial={{ x: '-100%' }}
                animate={{ x: '400%' }}
                transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}
              />
            </div>
          )}
        </main>
      </div>

      <IssueDrawer />
      <NewIssueModal />
      <CommandPalette />

      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.18 }}
            role="status"
            className="fixed bottom-4 left-1/2 z-[80] flex w-[calc(100%-2rem)] max-w-md -translate-x-1/2 items-start gap-2.5 rounded-xl border border-red-500/30 bg-elevated px-3 py-2.5 shadow-panel"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500 dark:text-red-400" />
            <p className="flex-1 text-[11px] leading-relaxed text-ink">{error}</p>
            <button
              type="button"
              onClick={dismissError}
              aria-label="Dismiss error"
              className="icon-button h-6 w-6"
            >
              <X className="h-3 w-3" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

import { motion } from 'framer-motion';
import { Command, Menu as MenuIcon, Plus, Search, X } from 'lucide-react';
import { useMemo } from 'react';
import { SPRINT_STATUS_META } from '../../lib/constants';
import { filterTasks } from '../../lib/tasks';
import { cn, isMacPlatform, percentage } from '../../lib/utils';
import { useBoardStore } from '../../store/useBoardStore';
import { useUiStore } from '../../store/useUiStore';
import { FilterBar } from '../board/FilterBar';
import { Kbd } from '../ui/Kbd';

export function Header() {
  const data = useBoardStore((state) => state.data);
  const filters = useBoardStore((state) => state.filters);
  const setSearch = useBoardStore((state) => state.setSearch);
  const setCommandOpen = useUiStore((state) => state.setCommandOpen);
  const setMobileNavOpen = useUiStore((state) => state.setMobileNavOpen);
  const openNewIssue = useUiStore((state) => state.openNewIssue);

  const sprint = data?.sprint;
  const statusMeta = sprint ? SPRINT_STATUS_META[sprint.status] : null;

  const metrics = useMemo(() => {
    const tasks = data?.tasks ?? [];
    const totalPoints = tasks.reduce((sum, task) => sum + task.storyPoints, 0);
    const donePoints = tasks
      .filter((task) => task.status === 'done')
      .reduce((sum, task) => sum + task.storyPoints, 0);
    const visible = data ? filterTasks(tasks, filters, { members: data.members }) : [];
    return {
      totalPoints,
      donePoints,
      progress: percentage(donePoints, totalPoints),
      visibleCount: visible.length,
    };
  }, [data, filters]);

  const searchField = (
    <div className="relative w-full">
      <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-subtle" />
      <input
        type="search"
        value={filters.search}
        onChange={(event) => setSearch(event.target.value)}
        placeholder="Search issues…"
        aria-label="Search issues"
        className="h-8 w-full rounded-lg border border-line bg-surface pl-8 pr-7 text-[12px] text-ink outline-none transition placeholder:text-subtle focus:border-brand focus:ring-2 focus:ring-brand/20 [&::-webkit-search-cancel-button]:hidden"
      />
      {filters.search && (
        <button
          type="button"
          onClick={() => setSearch('')}
          aria-label="Clear search"
          className="absolute right-1 top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded text-subtle transition hover:bg-zinc-500/10 hover:text-ink"
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </div>
  );

  return (
    <header className="sticky top-0 z-30 shrink-0 border-b border-line bg-bg">
      <div className="flex flex-col gap-2.5 px-4 py-3 lg:px-6">
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setMobileNavOpen(true)}
            className="icon-button h-8 w-8 lg:hidden"
            aria-label="Open navigation"
          >
            <MenuIcon className="h-4 w-4" />
          </button>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 text-[10px] font-medium text-subtle">
              <span className="hidden max-w-[180px] truncate sm:inline">
                {data?.workspace.name ?? 'Nexora'}
              </span>
              <span className="hidden text-line-strong sm:inline">/</span>
              <span>Board</span>
              <span className="ml-auto flex items-center gap-1.5 md:hidden">
                <span className="h-1 w-12 overflow-hidden rounded-full bg-zinc-500/15">
                  <span
                    className="block h-full rounded-full bg-brand"
                    style={{ width: `${metrics.progress}%` }}
                  />
                </span>
                <span className="tabular-nums">{metrics.progress}%</span>
              </span>
            </div>

            <div className="mt-0.5 flex min-w-0 items-center gap-2">
              <h1 className="truncate font-display text-[16px] font-semibold tracking-[-0.01em] text-ink">
                {sprint?.name ?? 'Sprint board'}
              </h1>
              {statusMeta && (
                <span
                  className={cn(
                    'inline-flex shrink-0 items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-medium leading-4',
                    statusMeta.soft,
                  )}
                >
                  <span className={cn('h-1.5 w-1.5 rounded-full', statusMeta.dot)} />
                  {statusMeta.label}
                </span>
              )}
              <div className="ml-1.5 hidden items-center gap-2 md:flex">
                <div className="h-1 w-24 overflow-hidden rounded-full bg-zinc-500/15">
                  <motion.div
                    className="h-full rounded-full bg-gradient-to-r from-brand to-brand-soft"
                    initial={false}
                    animate={{ width: `${metrics.progress}%` }}
                    transition={{ duration: 0.45, ease: 'easeOut' }}
                  />
                </div>
                <span className="text-[10px] font-medium tabular-nums text-subtle">
                  {metrics.progress}% complete
                </span>
              </div>
            </div>
          </div>

          <div className="hidden items-center gap-2 md:flex">
            <div className="w-[180px] xl:w-[240px]">{searchField}</div>
            <button
              type="button"
              onClick={() => setCommandOpen(true)}
              className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg border border-line bg-surface px-2 text-[11px] text-muted transition hover:bg-zinc-500/10 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
              aria-label="Open command palette"
            >
              <Command className="h-3.5 w-3.5" />
              <span className="flex items-center gap-0.5">
                <Kbd>{isMacPlatform ? '⌘' : 'Ctrl'}</Kbd>
                <Kbd>K</Kbd>
              </span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => openNewIssue('todo')}
            disabled={!data}
            className="btn-primary h-8 shrink-0 px-2.5 sm:px-3"
          >
            <Plus className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">New Issue</span>
          </button>
        </div>

        <div className="flex flex-col gap-2 md:flex-row md:items-center">
          <div className="md:hidden">{searchField}</div>
          <FilterBar visibleCount={metrics.visibleCount} />
        </div>
      </div>
    </header>
  );
}

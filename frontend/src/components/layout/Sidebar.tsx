import { AnimatePresence, motion } from 'framer-motion';
import {
  Check,
  ChevronsUpDown,
  CircleUserRound,
  Flame,
  Layers,
  LayoutDashboard,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  X,
} from 'lucide-react';
import { useEffect } from 'react';
import type { Sprint } from '../../types';
import { SPRINT_STATUS_META } from '../../lib/constants';
import { cn } from '../../lib/utils';
import { useAuthStore } from '../../store/useAuthStore';
import { useBoardStore } from '../../store/useBoardStore';
import { useUiStore } from '../../store/useUiStore';
import { Avatar, AvatarStack } from '../ui/Avatar';
import { BrandMark, Wordmark } from '../ui/Brand';
import { Menu } from '../ui/Menu';
import { ThemeToggle } from '../ui/ThemeToggle';

const sprintRank: Record<Sprint['status'], number> = {
  active: 0,
  completed: 1,
  planned: 2,
};

interface SidebarContentProps {
  collapsed: boolean;
  variant: 'desktop' | 'mobile';
  onNavigate: () => void;
}

function SidebarContent({ collapsed, variant, onNavigate }: SidebarContentProps) {
  const session = useAuthStore((state) => state.session);
  const logout = useAuthStore((state) => state.logout);
  const data = useBoardStore((state) => state.data);
  const filters = useBoardStore((state) => state.filters);
  const selectSprint = useBoardStore((state) => state.selectSprint);
  const applyQuickFilter = useBoardStore((state) => state.applyQuickFilter);
  const clearFilters = useBoardStore((state) => state.clearFilters);
  const resetBoard = useBoardStore((state) => state.resetBoard);
  const toggleSidebar = useUiStore((state) => state.toggleSidebar);

  const sprints = [...(data?.sprints ?? [])].sort(
    (a, b) => sprintRank[a.status] - sprintRank[b.status],
  );
  const activeSprint = data?.sprint;
  const members = data?.members ?? [];
  const tasks = data?.tasks ?? [];

  const myIssuesActive = Boolean(
    session && filters.assigneeIds.includes(session.user.id),
  );
  const highPriorityActive =
    filters.priority.length === 2 &&
    filters.priority.includes('urgent') &&
    filters.priority.includes('high');
  const hasFilters =
    Boolean(filters.search.trim()) ||
    filters.priority.length > 0 ||
    filters.assigneeIds.length > 0 ||
    filters.labelIds.length > 0;

  const myIssuesCount = session
    ? tasks.filter((task) => task.assigneeId === session.user.id).length
    : 0;
  const highPriorityCount = tasks.filter(
    (task) => task.priority === 'urgent' || task.priority === 'high',
  ).length;

  const handleLogout = () => {
    resetBoard();
    void logout();
  };

  const navItemClass = cn(
    'flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-[12px] font-medium text-muted transition hover:bg-zinc-500/10 hover:text-ink',
    collapsed && 'justify-center px-0 py-2',
  );

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div
        className={cn(
          'flex h-[52px] shrink-0 items-center gap-2 border-b border-line',
          collapsed ? 'justify-center px-2' : 'px-3',
        )}
      >
        {collapsed ? (
          <button
            type="button"
            onClick={toggleSidebar}
            title="Expand sidebar"
            aria-label="Expand sidebar"
            className="rounded-lg transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50"
          >
            <BrandMark />
          </button>
        ) : (
          <>
            <BrandMark />
            <Wordmark />
            <div className="flex-1" />
            {variant === 'desktop' ? (
              <button
                type="button"
                onClick={toggleSidebar}
                className="icon-button h-7 w-7"
                aria-label="Collapse sidebar"
                title="Collapse sidebar"
              >
                <PanelLeftClose className="h-3.5 w-3.5" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  onNavigate();
                }}
                className="icon-button h-7 w-7"
                aria-label="Close navigation"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-3">
        <Menu
          align="start"
          className={cn('mt-3', collapsed && 'flex justify-center')}
          panelClassName="w-[236px]"
          label="Switch workspace"
          trigger={({ open, toggle }) => (
            <button
              type="button"
              onClick={toggle}
              aria-expanded={open}
              aria-haspopup="dialog"
              title={data?.workspace.name ?? 'Workspace'}
              className={cn(
                'flex w-full items-center gap-2 rounded-lg border border-transparent px-1.5 py-1.5 transition hover:bg-zinc-500/10',
                collapsed && 'w-auto justify-center px-0',
              )}
            >
              <span className="grid h-6 w-6 shrink-0 place-items-center rounded-[6px] bg-gradient-to-br from-zinc-600 to-zinc-800 text-[10px] font-semibold text-white ring-1 ring-white/10 dark:from-zinc-500 dark:to-zinc-700">
                {data?.workspace.name.charAt(0) ?? 'N'}
              </span>
              {!collapsed && (
                <>
                  <span className="min-w-0 flex-1 text-left">
                    <span className="block truncate text-[12px] font-medium text-ink">
                      {data?.workspace.name ?? 'Loading workspace…'}
                    </span>
                    <span className="block truncate text-[10px] text-subtle">
                      Sandbox workspace
                    </span>
                  </span>
                  <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 text-subtle" />
                </>
              )}
            </button>
          )}
        >
          {({ close }) => (
            <div>
              <p className="px-2 pb-1 pt-1.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-subtle">
                Workspaces
              </p>
              <button
                type="button"
                onClick={close}
                className="menu-item justify-between bg-zinc-500/10 text-ink"
              >
                <span className="flex min-w-0 items-center gap-2">
                  <Layers className="h-3.5 w-3.5 shrink-0 text-subtle" />
                  <span className="truncate">{data?.workspace.name ?? 'Nexora'}</span>
                </span>
                <Check className="h-3.5 w-3.5 shrink-0 text-brand-soft" />
              </button>
              <div className="my-1.5 h-px bg-line" />
              <div className="px-2 pb-1.5">
                <AvatarStack users={members} max={5} />
                <p className="mt-2 text-[10px] leading-relaxed text-subtle">
                  {members.length} members · Demo sandbox
                </p>
              </div>
            </div>
          )}
        </Menu>

        {!collapsed && (
          <p className="px-2 pb-1 pt-5 text-[10px] font-semibold uppercase tracking-[0.08em] text-subtle">
            Sprints
          </p>
        )}

        <Menu
          align="start"
          className={cn(collapsed && 'mt-2 flex justify-center')}
          panelClassName="w-[232px]"
          label="Switch sprint"
          trigger={({ open, toggle }) => (
            <button
              type="button"
              onClick={toggle}
              aria-expanded={open}
              aria-haspopup="dialog"
              title={activeSprint?.name ?? 'Sprint'}
              className={cn(
                'relative flex w-full items-center gap-2 rounded-lg border border-transparent px-1.5 py-1.5 transition hover:bg-zinc-500/10',
                collapsed && 'w-auto justify-center px-0 py-2',
              )}
            >
              <Layers className="h-4 w-4 shrink-0 text-subtle" />
              {!collapsed && (
                <>
                  <span className="min-w-0 flex-1 text-left">
                    <span className="block truncate text-[12px] font-medium text-ink">
                      {activeSprint?.name ?? 'Loading board…'}
                    </span>
                    {activeSprint && (
                      <span className="flex items-center gap-1.5 text-[10px] text-subtle">
                        <span
                          className={cn(
                            'h-1.5 w-1.5 rounded-full',
                            SPRINT_STATUS_META[activeSprint.status].dot,
                          )}
                        />
                        {SPRINT_STATUS_META[activeSprint.status].label}
                      </span>
                    )}
                  </span>
                  <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 text-subtle" />
                </>
              )}
              {collapsed && (
                <span
                  className={cn(
                    'absolute ml-4 mt-4 h-1.5 w-1.5 rounded-full ring-2 ring-sidebar',
                    activeSprint ? SPRINT_STATUS_META[activeSprint.status].dot : 'bg-zinc-400',
                  )}
                />
              )}
            </button>
          )}
        >
          {({ close }) => (
            <div>
              <p className="px-2 pb-1 pt-1.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-subtle">
                Switch sprint
              </p>
              {sprints.length === 0 && (
                <p className="px-2 py-2 text-[11px] text-subtle">No sprints available.</p>
              )}
              {sprints.map((sprint) => {
                const meta = SPRINT_STATUS_META[sprint.status];
                const isActive = sprint.id === activeSprint?.id;
                return (
                  <button
                    key={sprint.id}
                    type="button"
                    onClick={() => {
                      void selectSprint(sprint.id);
                      close();
                      onNavigate();
                    }}
                    className={cn(
                      'menu-item justify-between gap-3',
                      isActive && 'bg-zinc-500/10 text-ink',
                    )}
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      <span className={cn('h-1.5 w-1.5 shrink-0 rounded-full', meta.dot)} />
                      <span className="truncate">{sprint.name}</span>
                    </span>
                    <span className="flex shrink-0 items-center gap-1.5">
                      <span className="text-[10px] text-subtle">{meta.label}</span>
                      {isActive && <Check className="h-3.5 w-3.5 text-brand-soft" />}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </Menu>

        <div className={cn('mt-5 space-y-0.5', collapsed && 'mt-3')}>
          {!collapsed && (
            <p className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-subtle">
              Views
            </p>
          )}
          <button
            type="button"
            onClick={() => {
              clearFilters();
              onNavigate();
            }}
            title="Board"
            className={cn(navItemClass, !hasFilters && 'bg-zinc-500/10 text-ink')}
          >
            <LayoutDashboard className="h-4 w-4 shrink-0" />
            {!collapsed && (
              <>
                <span className="flex-1 text-left">Board</span>
                <span className="text-[10px] tabular-nums text-subtle">{tasks.length}</span>
              </>
            )}
          </button>
          <button
            type="button"
            onClick={() => {
              if (session) applyQuickFilter('mine', session.user.id);
              onNavigate();
            }}
            title="My Issues"
            className={cn(navItemClass, myIssuesActive && 'bg-brand/10 text-ink')}
          >
            <CircleUserRound className="h-4 w-4 shrink-0" />
            {!collapsed && (
              <>
                <span className="flex-1 text-left">My Issues</span>
                <span className="text-[10px] tabular-nums text-subtle">{myIssuesCount}</span>
              </>
            )}
          </button>
          <button
            type="button"
            onClick={() => {
              applyQuickFilter('high');
              onNavigate();
            }}
            title="High Priority"
            className={cn(navItemClass, highPriorityActive && 'bg-brand/10 text-ink')}
          >
            <Flame className="h-4 w-4 shrink-0" />
            {!collapsed && (
              <>
                <span className="flex-1 text-left">High Priority</span>
                <span className="text-[10px] tabular-nums text-subtle">
                  {highPriorityCount}
                </span>
              </>
            )}
          </button>
        </div>

        {collapsed && (
          <div className="mt-3 flex justify-center">
            <button
              type="button"
              onClick={toggleSidebar}
              className="icon-button"
              title="Expand sidebar"
              aria-label="Expand sidebar"
            >
              <PanelLeftOpen className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      <div className="shrink-0 border-t border-line p-2">
        {collapsed ? (
          <div className="flex flex-col items-center gap-1">
            <ThemeToggle compact />
            <button
              type="button"
              onClick={handleLogout}
              className="icon-button"
              aria-label="Log out"
              title="Log out"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : (
          <>
            <ThemeToggle />
            <div className="mt-1.5 flex items-center gap-2 px-1 py-1.5">
              {session && <Avatar user={session.user} size="md" />}
              <div className="min-w-0 flex-1">
                <p className="truncate text-[12px] font-medium text-ink">
                  {session?.user.name ?? 'Nexora member'}
                </p>
                <p className="truncate text-[10px] text-subtle">
                  {session?.isDemo ? 'Recruiter sandbox' : session?.user.role}
                </p>
              </div>
              <button
                type="button"
                onClick={handleLogout}
                className="icon-button h-7 w-7"
                aria-label="Log out"
                title="Log out"
              >
                <LogOut className="h-3.5 w-3.5" />
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export function Sidebar() {
  const sidebarCollapsed = useUiStore((state) => state.sidebarCollapsed);

  return (
    <aside
      className={cn(
        'hidden shrink-0 border-r border-line bg-sidebar transition-[width] duration-200 ease-out lg:flex lg:flex-col',
        sidebarCollapsed ? 'w-[64px]' : 'w-[244px]',
      )}
    >
      <SidebarContent
        collapsed={sidebarCollapsed}
        variant="desktop"
        onNavigate={() => undefined}
      />
    </aside>
  );
}

export function MobileSidebar() {
  const mobileNavOpen = useUiStore((state) => state.mobileNavOpen);
  const setMobileNavOpen = useUiStore((state) => state.setMobileNavOpen);

  useEffect(() => {
    if (!mobileNavOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMobileNavOpen(false);
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [mobileNavOpen, setMobileNavOpen]);

  return (
    <AnimatePresence>
      {mobileNavOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-[2px]"
            onClick={() => setMobileNavOpen(false)}
          />
          <motion.aside
            initial={{ x: -290 }}
            animate={{ x: 0 }}
            exit={{ x: -290 }}
            transition={{ type: 'spring', stiffness: 380, damping: 36 }}
            className="relative flex h-full w-[276px] flex-col border-r border-line bg-sidebar shadow-2xl"
          >
            <SidebarContent
              collapsed={false}
              variant="mobile"
              onNavigate={() => setMobileNavOpen(false)}
            />
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  );
}

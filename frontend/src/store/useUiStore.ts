import { create } from 'zustand';
import type { TaskStatus, Theme } from '../types';

const THEME_KEY = 'nexora-theme';
const SIDEBAR_KEY = 'nexora-sidebar-collapsed';

function currentTheme(): Theme {
  if (typeof document === 'undefined') return 'dark';
  return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
}

function readSidebarCollapsed(): boolean {
  try {
    return window.localStorage.getItem(SIDEBAR_KEY) === 'true';
  } catch {
    return false;
  }
}

function applyTheme(theme: Theme): void {
  const root = document.documentElement;
  root.classList.toggle('dark', theme === 'dark');
  root.style.colorScheme = theme;

  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) {
    meta.setAttribute('content', theme === 'dark' ? '#08080A' : '#FAFAFA');
  }

  try {
    window.localStorage.setItem(THEME_KEY, theme);
  } catch {
    // Theme still applies for this session if storage is unavailable.
  }
}

interface UiState {
  theme: Theme;
  sidebarCollapsed: boolean;
  mobileNavOpen: boolean;
  commandOpen: boolean;
  newIssueOpen: boolean;
  newIssueStatus: TaskStatus;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  toggleSidebar: () => void;
  setMobileNavOpen: (open: boolean) => void;
  setCommandOpen: (open: boolean) => void;
  openNewIssue: (status?: TaskStatus) => void;
  closeNewIssue: () => void;
}

export const useUiStore = create<UiState>((set, get) => ({
  theme: currentTheme(),
  sidebarCollapsed: readSidebarCollapsed(),
  mobileNavOpen: false,
  commandOpen: false,
  newIssueOpen: false,
  newIssueStatus: 'todo',

  setTheme: (theme) => {
    applyTheme(theme);
    set({ theme });
  },

  toggleTheme: () => {
    const next: Theme = get().theme === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    set({ theme: next });
  },

  toggleSidebar: () =>
    set((state) => {
      const collapsed = !state.sidebarCollapsed;
      try {
        window.localStorage.setItem(SIDEBAR_KEY, String(collapsed));
      } catch {
        // Ignore storage failures.
      }
      return { sidebarCollapsed: collapsed };
    }),

  setMobileNavOpen: (open) => set({ mobileNavOpen: open }),
  setCommandOpen: (open) => set({ commandOpen: open }),
  openNewIssue: (status) =>
    set({ newIssueOpen: true, newIssueStatus: status ?? 'todo', commandOpen: false }),
  closeNewIssue: () => set({ newIssueOpen: false }),
}));

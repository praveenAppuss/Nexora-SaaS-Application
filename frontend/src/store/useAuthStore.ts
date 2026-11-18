import { create } from 'zustand';
import * as api from '../services/api';
import type { AuthSession } from '../types';

function readableError(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}

interface AuthState {
  session: AuthSession | null;
  isInitialized: boolean;
  isAuthenticating: boolean;
  error: string | null;
  initialize: () => Promise<void>;
  login: (email: string, password: string) => Promise<boolean>;
  demoLogin: () => Promise<boolean>;
  logout: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  session: null,
  isInitialized: false,
  isAuthenticating: false,
  error: null,

  initialize: async () => {
    if (get().isInitialized) return;
    try {
      const session = await api.getCurrentSession();
      set({ session, isInitialized: true });
    } catch {
      set({ session: null, isInitialized: true });
    }
  },

  login: async (email, password) => {
    set({ isAuthenticating: true, error: null });
    try {
      const session = await api.login(email, password);
      set({ session, isAuthenticating: false });
      return true;
    } catch (error) {
      set({
        isAuthenticating: false,
        error: readableError(error, 'Unable to sign in. Please try again.'),
      });
      return false;
    }
  },

  demoLogin: async () => {
    set({ isAuthenticating: true, error: null });
    try {
      const session = await api.demoLogin();
      set({ session, isAuthenticating: false });
      return true;
    } catch (error) {
      set({
        isAuthenticating: false,
        error: readableError(error, 'The demo workspace could not be opened.'),
      });
      return false;
    }
  },

  logout: async () => {
    try {
      await api.logout();
    } finally {
      set({ session: null, error: null, isAuthenticating: false });
    }
  },

  clearError: () => set({ error: null }),
}));

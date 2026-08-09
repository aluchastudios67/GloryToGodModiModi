import { create } from 'zustand';
import * as authApi from '../src/api/auth';
import type { Me } from '../src/api/auth';
import {
  setAccessToken,
  setSessionLostHandler,
} from '../src/api/client';
import { tokenStorage } from '../src/api/token-storage';

/**
 * Session state.
 *
 * Holds `status` and the user — **never the tokens**. Those live in the
 * keychain via `tokenStorage`; putting them here would put them in memory that
 * a devtools dump or a state-persistence plugin could read.
 */
export type AuthStatus = 'loading' | 'authed' | 'anon';

type AuthState = {
  status: AuthStatus;
  user: Me | null;

  /** Reads stored tokens and confirms them against the server. */
  restore: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (input: {
    email: string;
    password: string;
    name: string;
    isWalker?: boolean;
  }) => Promise<void>;
  signOut: () => Promise<void>;
  /** Called by the client when a refresh fails: the session is over. */
  handleSessionLost: () => void;
};

export const useAuthStore = create<AuthState>((set) => ({
  status: 'loading',
  user: null,

  restore: async () => {
    const stored = await tokenStorage.load();

    if (!stored) {
      set({ status: 'anon', user: null });
      return;
    }

    setAccessToken(stored.accessToken);

    try {
      // Confirm with the server rather than trusting a token that may have
      // been revoked while the app was closed.
      const user = await authApi.fetchMe();
      set({ status: 'authed', user });
    } catch {
      // The interceptor already tried to refresh. Reaching here means it could
      // not, so the stored pair is worthless.
      await tokenStorage.clear();
      setAccessToken(null);
      set({ status: 'anon', user: null });
    }
  },

  signIn: async (email, password) => {
    const result = await authApi.login({ email, password });
    await tokenStorage.save(result);
    setAccessToken(result.accessToken);
    set({ status: 'authed', user: result.user });
  },

  signUp: async (input) => {
    const result = await authApi.register(input);
    await tokenStorage.save(result);
    setAccessToken(result.accessToken);
    set({ status: 'authed', user: result.user });
  },

  signOut: async () => {
    const stored = await tokenStorage.load();

    if (stored) {
      // Best effort: a failed logout must still clear the device, or the user
      // stays "signed in" on a phone they wanted signed out.
      await authApi.logout(stored.refreshToken).catch(() => undefined);
    }

    await tokenStorage.clear();
    setAccessToken(null);
    set({ status: 'anon', user: null });
  },

  handleSessionLost: () => {
    set({ status: 'anon', user: null });
  },
}));

// Wired once at module load so the client can drop the session without
// importing the store and creating a cycle.
setSessionLostHandler(() => {
  useAuthStore.getState().handleSessionLost();
});

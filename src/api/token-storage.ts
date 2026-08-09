import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

/**
 * Where tokens live.
 *
 * The keychain on iOS and the Keystore on Android — never AsyncStorage, never
 * zustand, never a file. Tokens are the whole session; anything readable by
 * another app or by a filesystem dump is not good enough.
 *
 * Web falls back to localStorage because there is no secure store in a browser.
 * Web is a layout-checking target here, not a shipping one; if it ever ships,
 * this is the line to revisit.
 */

const ACCESS_KEY = 'modimodi.accessToken';
const REFRESH_KEY = 'modimodi.refreshToken';

const isWeb = Platform.OS === 'web';

async function setItem(key: string, value: string): Promise<void> {
  if (isWeb) {
    globalThis.localStorage?.setItem(key, value);
    return;
  }
  await SecureStore.setItemAsync(key, value);
}

async function getItem(key: string): Promise<string | null> {
  if (isWeb) return globalThis.localStorage?.getItem(key) ?? null;
  return SecureStore.getItemAsync(key);
}

async function removeItem(key: string): Promise<void> {
  if (isWeb) {
    globalThis.localStorage?.removeItem(key);
    return;
  }
  await SecureStore.deleteItemAsync(key);
}

export type StoredTokens = {
  accessToken: string;
  refreshToken: string;
};

export const tokenStorage = {
  async save(tokens: StoredTokens): Promise<void> {
    await Promise.all([
      setItem(ACCESS_KEY, tokens.accessToken),
      setItem(REFRESH_KEY, tokens.refreshToken),
    ]);
  },

  async load(): Promise<StoredTokens | null> {
    const [accessToken, refreshToken] = await Promise.all([
      getItem(ACCESS_KEY),
      getItem(REFRESH_KEY),
    ]);

    // A half-present pair is worse than none: it would send a stale access
    // token with no way to refresh it.
    if (!accessToken || !refreshToken) return null;
    return { accessToken, refreshToken };
  },

  async clear(): Promise<void> {
    await Promise.all([removeItem(ACCESS_KEY), removeItem(REFRESH_KEY)]);
  },
};

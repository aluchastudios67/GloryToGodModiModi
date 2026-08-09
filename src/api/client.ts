import axios, {
  AxiosError,
  AxiosInstance,
  InternalAxiosRequestConfig,
} from 'axios';
import Constants from 'expo-constants';
import { RefreshQueue } from './refresh-queue';
import { tokenStorage } from './token-storage';

/**
 * The one axios instance. Attaches the access token, and on a 401 refreshes
 * once — however many requests failed at the same moment — then retries them.
 */

/** Read from app.json `extra.apiUrl`; see README for pointing it at your LAN. */
export const API_BASE_URL: string =
  (Constants.expoConfig?.extra as { apiUrl?: string } | undefined)?.apiUrl ??
  'http://localhost:3000';

/** The shape every failure from this API takes. */
export type ApiErrorBody = {
  error: { code: string; message: string; requestId: string };
};

export class ApiError extends Error {
  constructor(
    readonly code: string,
    readonly status: number,
    message: string,
    readonly requestId?: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/** Marks a request we have already retried, so a loop is impossible. */
type RetriableConfig = InternalAxiosRequestConfig & { _retried?: boolean };

let accessToken: string | null = null;
let onSessionLost: (() => void) | null = null;

export const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15_000,
  headers: { 'content-type': 'application/json' },
});

/** Called by the auth store whenever tokens change. */
export function setAccessToken(token: string | null): void {
  accessToken = token;
}

/** Called once at startup so the store can drop the session on a hard 401. */
export function setSessionLostHandler(handler: () => void): void {
  onSessionLost = handler;
}

const refreshQueue = new RefreshQueue(async () => {
  const stored = await tokenStorage.load();
  if (!stored) throw new Error('No refresh token');

  // Deliberately a bare axios call: going through `api` would re-enter this
  // interceptor and, on a failing refresh, recurse.
  const response = await axios.post<{
    accessToken: string;
    refreshToken: string;
  }>(
    `${API_BASE_URL}/auth/refresh`,
    { refreshToken: stored.refreshToken },
    { timeout: 15_000 },
  );

  await tokenStorage.save(response.data);
  accessToken = response.data.accessToken;
  return response.data.accessToken;
});

api.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers.set('authorization', `Bearer ${accessToken}`);
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<ApiErrorBody>) => {
    const config = error.config as RetriableConfig | undefined;
    const status = error.response?.status;

    const canRetry =
      status === 401 &&
      config !== undefined &&
      !config._retried &&
      // The refresh endpoint returning 401 means the session is genuinely over.
      !config.url?.includes('/auth/');

    if (canRetry) {
      config._retried = true;
      try {
        const fresh = await refreshQueue.run();
        config.headers.set('authorization', `Bearer ${fresh}`);
        return await api.request(config);
      } catch {
        await tokenStorage.clear();
        accessToken = null;
        onSessionLost?.();
      }
    }

    throw toApiError(error);
  },
);

export function toApiError(error: AxiosError<ApiErrorBody>): ApiError {
  const body = error.response?.data;

  if (body && typeof body === 'object' && 'error' in body) {
    return new ApiError(
      body.error.code,
      error.response?.status ?? 0,
      body.error.message,
      body.error.requestId,
    );
  }

  // No response at all: airplane mode, DNS failure, a cold-starting server.
  return new ApiError(
    error.code === 'ECONNABORTED' ? 'TIMEOUT' : 'NETWORK_ERROR',
    error.response?.status ?? 0,
    error.message,
  );
}

/** Exposed for the test that asserts one refresh per burst. */
export const __refreshQueue = refreshQueue;

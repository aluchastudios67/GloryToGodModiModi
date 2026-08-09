import { api } from './client';

/**
 * Auth endpoints, one function each. Types are hand-written for Phase 2;
 * Phase 3 replaces them with `src/api/generated.ts` from the OpenAPI spec.
 */

export type Me = {
  id: string;
  email: string;
  name: string;
  avatarKey: string | null;
  isOwner: boolean;
  isWalker: boolean;
  hasWalkerProfile: boolean;
  createdAt: string;
};

export type TokenPair = {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
};

export type AuthResult = TokenPair & { user: Me };

export async function register(input: {
  email: string;
  password: string;
  name: string;
  isWalker?: boolean;
}): Promise<AuthResult> {
  const { data } = await api.post<AuthResult>('/auth/register', input);
  return data;
}

export async function login(input: {
  email: string;
  password: string;
}): Promise<AuthResult> {
  const { data } = await api.post<AuthResult>('/auth/login', input);
  return data;
}

export async function fetchMe(): Promise<Me> {
  const { data } = await api.get<Me>('/me');
  return data;
}

export async function logout(refreshToken: string): Promise<void> {
  await api.post('/auth/logout', { refreshToken });
}

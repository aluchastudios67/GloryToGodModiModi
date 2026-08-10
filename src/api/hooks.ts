import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { api } from './client';
import type { components } from './generated';

/**
 * Server state lives in TanStack Query, not zustand.
 *
 * Types come from `generated.ts`, which is produced from the API's own OpenAPI
 * document — so a field rename on the server becomes a TypeScript error here
 * rather than an undefined at runtime in front of a user.
 */

export type Walker = components['schemas']['PublicWalkerDto'];
export type WalkerPage = components['schemas']['WalkerPageDto'];

export type WalkerFilters = {
  q?: string;
  availableNow?: boolean;
  maxPrice30Tetri?: number;
  district?: string;
  verified?: boolean;
};

/** Stable, serialisable key — undefined values are dropped so keys match. */
export const walkerKeys = {
  all: ['walkers'] as const,
  list: (filters: WalkerFilters) =>
    ['walkers', 'list', JSON.stringify(sortedEntries(filters))] as const,
  one: (id: string) => ['walkers', 'one', id] as const,
};

function sortedEntries(filters: WalkerFilters): [string, unknown][] {
  return Object.entries(filters)
    .filter(([, value]) => value !== undefined && value !== '')
    .sort(([a], [b]) => a.localeCompare(b));
}

function toParams(filters: WalkerFilters): Record<string, string> {
  const params: Record<string, string> = {};
  for (const [key, value] of sortedEntries(filters)) {
    params[key] = String(value);
  }
  return params;
}

export function useWalkers(filters: WalkerFilters = {}) {
  return useQuery({
    queryKey: walkerKeys.list(filters),
    queryFn: async (): Promise<WalkerPage> => {
      const { data } = await api.get<WalkerPage>('/walkers', {
        params: { ...toParams(filters), limit: 50 },
      });
      return data;
    },
  });
}

export function useWalker(id: string | undefined) {
  return useQuery({
    queryKey: walkerKeys.one(id ?? ''),
    enabled: Boolean(id),
    queryFn: async (): Promise<Walker> => {
      const { data } = await api.get<Walker>(`/walkers/${id ?? ''}`);
      return data;
    },
  });
}

export type Dog = components['schemas']['DogDto'];
export type Me = components['schemas']['MeDto'];
export type WalkerProfile = components['schemas']['WalkerProfileDto'];

export const dogKeys = { all: ['dogs'] as const };

export function useMyDogs() {
  return useQuery({
    queryKey: dogKeys.all,
    queryFn: async (): Promise<Dog[]> => {
      const { data } = await api.get<Dog[]>('/me/dogs');
      return data;
    },
  });
}

/**
 * Debounce that keeps the existing 250 ms feel from `app/(tabs)/search.tsx`,
 * but drives the *query key* rather than a manual fetch — so re-typing reuses
 * cached results instead of refetching.
 */
export function useDebounced<T>(value: T, delayMs = 250): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}

/** Lets a screen's retry button clear the walker cache and refetch. */
export function useInvalidateWalkers() {
  const client = useQueryClient();
  return () => client.invalidateQueries({ queryKey: walkerKeys.all });
}

/** ₾ from tetri — the app formats money, the API only ever sends integers. */
export function tetriToGel(tetri: number): number {
  return Math.round(tetri / 100);
}

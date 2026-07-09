/**
 * TanStack Query hooks — the app's data layer.
 *
 * Design decisions:
 *  - `notes` are cached per category filter, keyed by `notesKey(categoryId)`.
 *  - `useUpdateNote` (autosave) applies an optimistic patch to every cached
 *    notes list so the grid reflects edits instantly, then reconciles with the
 *    server response and rolls back on error.
 *  - Auth mutations invalidate `me` so the app re-derives auth state from the
 *    server rather than trusting client-side flags.
 */
'use client';

import { useRef } from 'react';
import { useMutation, useQuery, useQueryClient, type UseQueryOptions } from '@tanstack/react-query';
import {
  aiCategorize,
  aiSummarize,
  createNote,
  type CreateNoteInput,
  deleteNote,
  getCategories,
  getMe,
  getNotes,
  login,
  logout,
  register,
  updateNote,
  type UpdateNoteInput,
} from './endpoints';
import { ApiError } from './api';
import type { Category, Note, User } from './schemas';

/* ------------------------------ Query keys ----------------------------- */

export const queryKeys = {
  me: ['me'] as const,
  categories: ['categories'] as const,
  notes: (categoryId: number | null) => ['notes', categoryId] as const,
  notesRoot: ['notes'] as const,
};

/* -------------------------------- Auth --------------------------------- */

/**
 * Current user, or `null` when unauthenticated. A 401 is a normal "logged out"
 * signal, so we translate it to `null` instead of an error and never retry it.
 *
 * A transient failure (500/network) is *not* a logout signal, though: retrying
 * those a couple of times avoids bouncing a valid session to /login over a blip.
 */
export function useMe(options?: Partial<UseQueryOptions<User | null, ApiError>>) {
  return useQuery<User | null, ApiError>({
    queryKey: queryKeys.me,
    queryFn: async ({ signal }) => {
      try {
        return await getMe(signal);
      } catch (error) {
        if (error instanceof ApiError && error.isUnauthorized) return null;
        throw error;
      }
    },
    // Never retry a genuine 401 (it resolves to `null`), but retry transient
    // non-401 errors so a flaky /auth/me doesn't wrongly surface as an error.
    retry: (failureCount, error) =>
      !(error instanceof ApiError && error.isUnauthorized) && failureCount < 2,
    staleTime: 30_000,
    ...options,
  });
}

export function useLogin() {
  const queryClient = useQueryClient();
  return useMutation<User, ApiError, { email: string; password: string }>({
    mutationFn: login,
    onSuccess: (user) => {
      queryClient.setQueryData(queryKeys.me, user);
    },
  });
}

export function useRegister() {
  const queryClient = useQueryClient();
  return useMutation<User, ApiError, { email: string; password: string }>({
    mutationFn: register,
    onSuccess: (user) => {
      queryClient.setQueryData(queryKeys.me, user);
    },
  });
}

export function useLogout() {
  const queryClient = useQueryClient();
  return useMutation<void, ApiError, void>({
    mutationFn: logout,
    onSuccess: () => {
      queryClient.setQueryData(queryKeys.me, null);
      queryClient.removeQueries({ queryKey: queryKeys.notesRoot });
      queryClient.removeQueries({ queryKey: queryKeys.categories });
    },
  });
}

/* ----------------------------- Categories ------------------------------ */

export function useCategories(options?: Partial<UseQueryOptions<Category[], ApiError>>) {
  return useQuery<Category[], ApiError>({
    queryKey: queryKeys.categories,
    queryFn: ({ signal }) => getCategories(signal),
    staleTime: 60_000,
    ...options,
  });
}

/* -------------------------------- Notes -------------------------------- */

export function useNotes(
  categoryId: number | null,
  options?: Partial<UseQueryOptions<Note[], ApiError>>,
) {
  return useQuery<Note[], ApiError>({
    queryKey: queryKeys.notes(categoryId),
    queryFn: ({ signal }) => getNotes(categoryId, signal),
    ...options,
  });
}

/** Invalidate every cached notes list (all category filters) + counts. */
function invalidateNotesAndCounts(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: queryKeys.notesRoot });
  queryClient.invalidateQueries({ queryKey: queryKeys.categories });
}

export function useCreateNote() {
  const queryClient = useQueryClient();
  return useMutation<Note, ApiError, CreateNoteInput>({
    mutationFn: createNote,
    onSuccess: () => invalidateNotesAndCounts(queryClient),
  });
}

interface UpdateNoteVars {
  id: number;
  patch: UpdateNoteInput;
  /** Optional richer patch (e.g. category_detail) for the optimistic cache. */
  optimistic?: Partial<Note>;
}

interface UpdateNoteContext {
  previous: Array<[readonly unknown[], Note[] | undefined]>;
  /** This mutation's sequence number, used for the latest-wins guard below. */
  seq: number;
}

/**
 * Autosave mutation with optimistic updates across all notes lists.
 * The editor debounces the *call*; this hook owns the cache mechanics.
 */
export function useUpdateNote() {
  const queryClient = useQueryClient();
  // Per-note monotonically increasing sequence numbers. Autosave PATCHes for a
  // single note can be in flight concurrently and may resolve out of order; the
  // seq lets `onSuccess` skip writing a stale server response when a newer edit
  // for the same note has already been dispatched ("latest wins").
  const latestSeqRef = useRef<Map<number, number>>(new Map());

  return useMutation<Note, ApiError, UpdateNoteVars, UpdateNoteContext>({
    mutationFn: ({ id, patch }) => updateNote(id, patch),
    onMutate: async ({ id, patch, optimistic }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.notesRoot });
      const previous = queryClient.getQueriesData<Note[]>({
        queryKey: queryKeys.notesRoot,
      });
      // Claim the next sequence number for this note; it becomes the "latest"
      // dispatched edit until a newer onMutate bumps it.
      const seq = (latestSeqRef.current.get(id) ?? 0) + 1;
      latestSeqRef.current.set(id, seq);
      const merged: Partial<Note> = {
        ...(patch.title !== undefined ? { title: patch.title } : {}),
        ...(patch.content !== undefined ? { content: patch.content } : {}),
        ...(patch.category !== undefined ? { category: patch.category } : {}),
        ...optimistic,
        updated_at: new Date().toISOString(),
      };
      for (const [key, list] of previous) {
        if (!list) continue;
        queryClient.setQueryData<Note[]>(
          key,
          list.map((note) => (note.id === id ? { ...note, ...merged } : note)),
        );
      }
      return { previous, seq };
    },
    onError: (error, vars, context) => {
      // Don't blindly restore the pre-mutation snapshot:
      //  - a 404 means the note is already gone (e.g. deleted while this PATCH was
      //    in flight); restoring `previous` would resurrect the deleted row.
      //  - if a newer edit for this note was dispatched after this one, its
      //    optimistic state is fresher than this stale snapshot (latest-wins).
      const gone = error instanceof ApiError && error.status === 404;
      const superseded = context !== undefined && latestSeqRef.current.get(vars.id) !== context.seq;
      if (!gone && !superseded) {
        context?.previous.forEach(([key, list]) => queryClient.setQueryData(key, list));
      }
      // Reconcile with server truth regardless (covers both cases above).
      queryClient.invalidateQueries({ queryKey: queryKeys.notesRoot });
    },
    onSuccess: (updated, _vars, context) => {
      // Latest-wins: if a newer edit for this note was dispatched after this one,
      // its optimistic state is fresher than this (stale) server response — skip
      // the write so an out-of-order resolution can't clobber the newer edit.
      const latest = latestSeqRef.current.get(updated.id);
      if (context && latest !== undefined && latest > context.seq) return;
      // Replace optimistic rows with the server's canonical note.
      queryClient
        .getQueriesData<Note[]>({ queryKey: queryKeys.notesRoot })
        .forEach(([key, list]) => {
          if (!list) return;
          queryClient.setQueryData<Note[]>(
            key,
            list.map((note) => (note.id === updated.id ? updated : note)),
          );
        });
    },
    onSettled: () => {
      // Category may have changed → counts and per-category lists need a refresh.
      queryClient.invalidateQueries({ queryKey: queryKeys.categories });
    },
  });
}

export function useDeleteNote() {
  const queryClient = useQueryClient();
  return useMutation<void, ApiError, number>({
    mutationFn: deleteNote,
    onSuccess: () => invalidateNotesAndCounts(queryClient),
  });
}

/* --------------------------------- AI ---------------------------------- */

export function useAiCategorize() {
  return useMutation({ mutationFn: aiCategorize });
}

export function useAiSummarize() {
  return useMutation({ mutationFn: aiSummarize });
}

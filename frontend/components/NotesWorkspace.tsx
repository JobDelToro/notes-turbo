'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Note } from '@/lib/schemas';
import { useCategories, useCreateNote, useLogout, useNotes } from '@/lib/queries';
import { CategorySidebar } from './CategorySidebar';
import { NoteGrid } from './NoteGrid';
import { NoteEditor } from './NoteEditor';
import { EmptyState } from './EmptyState';
import { Button } from './Button';
import { PlusIcon } from './icons';

/**
 * The authenticated notes workspace: a 288px category sidebar beside a masonry
 * grid, with a "+ New Note" action and the editor overlay. Owns the active
 * category filter and the currently-open note.
 */
export function NotesWorkspace() {
  const router = useRouter();
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [openNote, setOpenNote] = useState<Note | null>(null);

  const categoriesQuery = useCategories();
  const notesQuery = useNotes(selectedCategoryId);
  // The "All Categories" tally must count every note, including uncategorized
  // ones — which aren't in any category's server-side count. The unfiltered list
  // is the default view (so this shares its cache and adds no request there), and
  // matches the grid, which is likewise bounded to the first page.
  const allNotesQuery = useNotes(null);
  const createNote = useCreateNote();
  const logout = useLogout();

  const categories = categoriesQuery.data ?? [];
  const notes = notesQuery.data ?? [];
  const totalCount =
    allNotesQuery.data?.length ?? categories.reduce((sum, c) => sum + c.note_count, 0);

  function handleNewNote() {
    // Default a new note to the active filter (or the first category) so it's
    // never orphaned and picks up a color right away.
    const category = selectedCategoryId ?? categories[0]?.id ?? null;
    createNote.mutate(
      { title: '', content: '', category },
      { onSuccess: (note) => setOpenNote(note) },
    );
  }

  async function handleLogout() {
    // Logout is best-effort: even if the request fails (offline / 5xx), clear
    // client state and navigate away rather than stranding the user with an
    // unhandled rejection. The server also expires the cookies on its side.
    try {
      await logout.mutateAsync();
    } catch {
      // swallow — the redirect below still gets the user out
    } finally {
      router.replace('/login');
    }
  }

  const showEmpty = !notesQuery.isLoading && notes.length === 0;

  return (
    <div className="flex min-h-dvh flex-col bg-cream lg:flex-row">
      <CategorySidebar
        categories={categories}
        selectedId={selectedCategoryId}
        onSelect={setSelectedCategoryId}
        isLoading={categoriesQuery.isLoading}
        totalCount={totalCount}
      />

      <main className="min-w-0 flex-1 px-5 py-6 sm:px-8">
        <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <h1 className="font-serif text-2xl font-bold text-ink sm:text-3xl">
            {selectedCategoryId === null
              ? 'All Notes'
              : (categories.find((c) => c.id === selectedCategoryId)?.name ?? 'Notes')}
          </h1>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleLogout}
              className="text-xs text-ink/60 underline-offset-4 hover:underline"
            >
              Log out
            </button>
            <Button
              onClick={handleNewNote}
              loading={createNote.isPending}
              leadingIcon={<PlusIcon size={16} />}
            >
              New Note
            </Button>
          </div>
        </header>

        {notesQuery.isError ? (
          <p className="text-sm text-red-600">
            {notesQuery.error?.message ?? 'Could not load your notes.'}
          </p>
        ) : showEmpty ? (
          <EmptyState />
        ) : (
          <NoteGrid notes={notes} onOpen={setOpenNote} />
        )}
      </main>

      {openNote ? (
        <NoteEditor note={openNote} categories={categories} onClose={() => setOpenNote(null)} />
      ) : null}
    </div>
  );
}

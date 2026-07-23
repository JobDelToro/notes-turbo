'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence } from 'motion/react';
import type { Note } from '@/lib/schemas';
import { useCategories, useCreateNote, useLogout, useMe, useNotes } from '@/lib/queries';
import { useOnboardingTour } from '@/lib/useOnboardingTour';
import { displayName, greetingForHour, isSameDay } from '@/lib/format';
import { cn } from '@/lib/cn';
import { CategorySidebar } from './CategorySidebar';
import { NoteGrid } from './NoteGrid';
import { NoteEditor } from './NoteEditor';
import { EmptyState } from './EmptyState';
import { Button } from './Button';
import { ChevronDownIcon, CloseIcon, HelpIcon, PlusIcon, SearchIcon, SortIcon } from './icons';

type SortKey = 'recent' | 'created' | 'title';

// A stable empty fallback so `?? []` doesn't hand a fresh array to the memos
// (and re-run them) on every render while a query is still loading.
const EMPTY_NOTES: Note[] = [];

/**
 * The authenticated workspace. Mobile-first: category pills on top, a scrolling
 * grid, and a thumb-reachable FAB to create a note; on `lg` it splits into a
 * left category rail + main column. Owns the active category filter, the search
 * query, the sort order, and the currently-open note.
 */
export function NotesWorkspace() {
  const router = useRouter();
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [openNote, setOpenNote] = useState<Note | null>(null);
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('recent');

  const meQuery = useMe();
  const categoriesQuery = useCategories();
  const notesQuery = useNotes(selectedCategoryId);
  // The "All" tally must count every note, including uncategorized ones — which
  // aren't in any category's server-side count. The unfiltered list is the
  // default view, so this shares its cache and adds no extra request.
  const allNotesQuery = useNotes(null);
  const createNote = useCreateNote();
  const logout = useLogout();

  const categories = categoriesQuery.data ?? [];
  const notes = notesQuery.data ?? EMPTY_NOTES;
  const allNotes = allNotesQuery.data ?? EMPTY_NOTES;
  const totalCount = allNotes.length || categories.reduce((sum, c) => sum + c.note_count, 0);

  const title =
    selectedCategoryId === null
      ? 'All Notes'
      : (categories.find((c) => c.id === selectedCategoryId)?.name ?? 'Notes');

  // Search (title + body, case-insensitive) then sort — memoized so typing or a
  // cache update doesn't re-sort on every unrelated render.
  const displayedNotes = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filtered = q
      ? notes.filter((n) => `${n.title}\n${n.content}`.toLowerCase().includes(q))
      : notes;
    return [...filtered].sort((a, b) => {
      if (sortKey === 'title') {
        const at = a.title.trim().toLowerCase();
        const bt = b.title.trim().toLowerCase();
        if (at && bt) return at.localeCompare(bt);
        return at ? -1 : bt ? 1 : 0; // untitled notes sort last
      }
      const field = sortKey === 'created' ? 'created_at' : 'updated_at';
      return new Date(b[field]).getTime() - new Date(a[field]).getTime();
    });
  }, [notes, search, sortKey]);

  // Computed at render from the client clock; the count is small so no memo is
  // needed. The greeting/stats live inside a `suppressHydrationWarning` block
  // because the prerender and the client clock can legitimately disagree.
  const today = new Date();
  const editedToday = allNotes.filter((n) => isSameDay(n.updated_at, today)).length;

  // Guided onboarding: auto-runs once for a new user, and the header "?" replays
  // it. Gated on categories being loaded so the tour has something to point at.
  const { start: startTour } = useOnboardingTour(
    !categoriesQuery.isLoading && categories.length > 0,
  );

  const name = displayName(meQuery.data?.email);
  const greeting = greetingForHour(today.getHours());
  const stats = [
    `${totalCount} ${totalCount === 1 ? 'note' : 'notes'}`,
    `${categories.length} ${categories.length === 1 ? 'category' : 'categories'}`,
    ...(editedToday > 0 ? [`${editedToday} edited today`] : []),
  ].join('  ·  ');

  function handleNewNote() {
    // Default a new note to the active filter (or the first category) so it's
    // never orphaned and picks up a color right away.
    const category = selectedCategoryId ?? categories[0]?.id ?? null;
    createNote.mutate(
      { title: '', content: '', category },
      { onSuccess: (note) => setOpenNote(note) },
    );
  }

  function handleUseTemplate(template: { title: string; content: string }) {
    const category = selectedCategoryId ?? categories[0]?.id ?? null;
    createNote.mutate({ ...template, category }, { onSuccess: (note) => setOpenNote(note) });
  }

  async function handleLogout() {
    // Best-effort: clear client state and navigate away even if the request
    // fails (offline / 5xx) rather than stranding the user.
    try {
      await logout.mutateAsync();
    } catch {
      // swallow — the redirect below still gets the user out
    } finally {
      router.replace('/login');
    }
  }

  const isLoadingNotes = notesQuery.isLoading && notes.length === 0;
  const showEmpty = !notesQuery.isLoading && notes.length === 0;
  const noSearchMatch = !showEmpty && !isLoadingNotes && displayedNotes.length === 0;

  return (
    <div className="flex min-h-dvh flex-col lg:flex-row">
      <CategorySidebar
        categories={categories}
        selectedId={selectedCategoryId}
        onSelect={setSelectedCategoryId}
        isLoading={categoriesQuery.isLoading}
        totalCount={totalCount}
      />

      <main className="min-w-0 flex-1 px-4 pb-24 pt-5 sm:px-6 lg:px-10 lg:pb-10 lg:pt-9">
        <header className="mb-6 flex flex-col gap-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-medium text-ink-muted" suppressHydrationWarning>
                {greeting}, {name} <span aria-hidden>👋</span>
              </p>
              <h1 className="mt-0.5 font-display text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
                {title}
              </h1>
              <p className="mt-1 text-sm text-ink-muted" suppressHydrationWarning>
                {stats}
              </p>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={startTour}
                aria-label="Take a tour"
                title="Take a tour"
                className="flex h-9 w-9 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-surface-2 hover:text-ink"
              >
                <HelpIcon size={18} />
              </button>
              <button
                type="button"
                onClick={handleLogout}
                className="rounded-full px-3 py-2 text-sm text-ink-muted transition-colors hover:bg-surface-2 hover:text-ink"
              >
                Log out
              </button>
              <Button
                onClick={handleNewNote}
                loading={createNote.isPending}
                leadingIcon={<PlusIcon size={18} />}
                data-tour="new-note"
                className="hidden sm:inline-flex"
              >
                New Note
              </Button>
            </div>
          </div>

          {notes.length > 0 ? (
            <div className="flex items-center gap-2">
              <SearchField value={search} onChange={setSearch} className="flex-1 sm:max-w-sm" />
              <SortField value={sortKey} onChange={setSortKey} />
            </div>
          ) : null}
        </header>

        {notesQuery.isError ? (
          <div className="rounded-[var(--radius-card)] border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">
            {notesQuery.error?.message ?? 'Could not load your notes.'}
          </div>
        ) : isLoadingNotes ? (
          <SkeletonGrid />
        ) : showEmpty ? (
          <EmptyState
            onNew={handleNewNote}
            onUseTemplate={handleUseTemplate}
            filtered={selectedCategoryId !== null}
          />
        ) : noSearchMatch ? (
          <NoResults query={search.trim()} onClear={() => setSearch('')} />
        ) : (
          <NoteGrid notes={displayedNotes} onOpen={setOpenNote} />
        )}
      </main>

      {/* Mobile FAB — the primary create action within thumb's reach. */}
      <button
        type="button"
        onClick={handleNewNote}
        aria-label="New note"
        data-tour="new-note-fab"
        className="fixed bottom-5 right-5 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-on-primary shadow-[var(--shadow-lg)] transition-transform duration-150 ease-[var(--ease-spring)] active:scale-90 sm:hidden"
      >
        <PlusIcon size={24} />
      </button>

      <AnimatePresence>
        {openNote ? (
          <NoteEditor
            key={openNote.id}
            note={openNote}
            categories={categories}
            onClose={() => setOpenNote(null)}
          />
        ) : null}
      </AnimatePresence>
    </div>
  );
}

/** Full-text search over the current category's notes. Escape clears it. */
function SearchField({
  value,
  onChange,
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  className?: string;
}) {
  return (
    <div className={cn('relative', className)}>
      <span className="pointer-events-none absolute inset-y-0 left-0 flex w-10 items-center justify-center text-ink-muted">
        <SearchIcon size={18} />
      </span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Escape') onChange('');
        }}
        placeholder="Search notes"
        aria-label="Search notes"
        className="h-11 w-full rounded-[var(--radius-field)] border border-border bg-surface pl-10 pr-9 text-sm text-ink placeholder:text-ink-muted focus:outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/35"
      />
      {value ? (
        <button
          type="button"
          onClick={() => onChange('')}
          aria-label="Clear search"
          className="absolute inset-y-0 right-0 flex w-9 items-center justify-center text-ink-muted transition-colors hover:text-ink"
        >
          <CloseIcon size={16} />
        </button>
      ) : null}
    </div>
  );
}

/** Sort control — a styled native select (accessible for free). */
function SortField({ value, onChange }: { value: SortKey; onChange: (v: SortKey) => void }) {
  return (
    <div className="relative shrink-0">
      <span className="pointer-events-none absolute inset-y-0 left-0 flex w-9 items-center justify-center text-ink-muted">
        <SortIcon size={16} />
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as SortKey)}
        aria-label="Sort notes"
        className="h-11 appearance-none rounded-[var(--radius-field)] border border-border bg-surface pl-9 pr-9 text-sm text-ink focus:outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/35"
      >
        <option value="recent">Last edited</option>
        <option value="created">Newest</option>
        <option value="title">Title A–Z</option>
      </select>
      <span className="pointer-events-none absolute inset-y-0 right-0 flex w-9 items-center justify-center text-ink-muted">
        <ChevronDownIcon size={16} />
      </span>
    </div>
  );
}

/** Shown when a search matches nothing (distinct from a first-run empty state). */
function NoResults({ query, onClear }: { query: string; onClear: () => void }) {
  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center px-6 text-center">
      <div className="mb-4 grid h-16 w-16 place-items-center rounded-2xl bg-surface-2 text-ink-muted">
        <SearchIcon size={26} />
      </div>
      <h2 className="font-display text-xl font-bold text-ink">No notes match “{query}”</h2>
      <p className="mt-1 max-w-xs text-sm text-ink-muted">
        Try a different search, or clear it to see everything.
      </p>
      <Button variant="outline" size="sm" onClick={onClear} className="mt-4">
        Clear search
      </Button>
    </div>
  );
}

/** Loading placeholder grid — shimmering blocks in the masonry rhythm. */
function SkeletonGrid() {
  return (
    <div className="columns-1 gap-4 sm:columns-2 xl:columns-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="skeleton mb-4 break-inside-avoid rounded-[var(--radius-card)]"
          style={{ height: 132 + (i % 3) * 40 }}
        />
      ))}
    </div>
  );
}

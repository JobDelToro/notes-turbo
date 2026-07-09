import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NoteEditor } from '@/components/NoteEditor';
import { categories, makeNote } from './fixtures';

const updateMutate = vi.fn();
const deleteMutate = vi.fn();
const aiCategorizeAsync = vi.fn();
const aiSummarizeAsync = vi.fn();

vi.mock('@/lib/queries', () => ({
  useUpdateNote: () => ({ mutate: updateMutate }),
  useDeleteNote: () => ({ mutate: deleteMutate, isPending: false }),
  useAiCategorize: () => ({ mutateAsync: aiCategorizeAsync, isPending: false }),
  useAiSummarize: () => ({ mutateAsync: aiSummarizeAsync, isPending: false }),
}));

describe('NoteEditor', () => {
  beforeEach(() => {
    updateMutate.mockReset();
    deleteMutate.mockReset();
    aiCategorizeAsync.mockReset();
    aiSummarizeAsync.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('applies the AI category suggestion even from the keyword heuristic (available:false)', async () => {
    // With no LLM key the backend still returns a usable category via a heuristic.
    aiCategorizeAsync.mockResolvedValue({
      available: false,
      source: 'heuristic',
      category_id: 2,
      category_name: 'School',
    });
    render(<NoteEditor note={makeNote()} categories={categories} onClose={vi.fn()} />);

    await userEvent.click(screen.getByRole('button', { name: /suggest category/i }));

    // The honest "keyword-based" hint appears (last thing the handler does)...
    expect(await screen.findByText(/keyword/i)).toBeInTheDocument();
    // ...and the suggested category was actually applied via a PATCH.
    expect(updateMutate).toHaveBeenCalledWith(
      expect.objectContaining({ id: 100, patch: { category: 2 } }),
      expect.anything(),
    );
  });

  it('surfaces an error notice and applies nothing when the AI request fails', async () => {
    // A 429/500/timeout rejects the mutation; the handler must catch it.
    aiCategorizeAsync.mockRejectedValue(new Error('boom'));
    render(<NoteEditor note={makeNote()} categories={categories} onClose={vi.fn()} />);

    await userEvent.click(screen.getByRole('button', { name: /suggest category/i }));

    expect(await screen.findByText(/could not reach the ai service/i)).toBeInTheDocument();
    // No category was applied (no PATCH fired).
    expect(updateMutate).not.toHaveBeenCalled();
  });

  it('prompts for content instead of a silent no-op on an empty note', async () => {
    render(
      <NoteEditor note={makeNote({ content: '' })} categories={categories} onClose={vi.fn()} />,
    );

    await userEvent.click(screen.getByRole('button', { name: /suggest category/i }));

    expect(await screen.findByText(/write something first/i)).toBeInTheDocument();
    // The AI isn't even called when there's nothing to categorize.
    expect(aiCategorizeAsync).not.toHaveBeenCalled();
  });

  it('deletes the note when the confirm is accepted', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    render(<NoteEditor note={makeNote()} categories={categories} onClose={vi.fn()} />);

    await userEvent.click(screen.getByRole('button', { name: /delete note/i }));

    expect(deleteMutate).toHaveBeenCalledWith(100, expect.anything());
  });

  it('cancels the pending autosave when the note is deleted (no racing PATCH)', () => {
    vi.useFakeTimers();
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    try {
      render(
        <NoteEditor
          note={makeNote({ title: '', content: '' })}
          categories={categories}
          onClose={vi.fn()}
        />,
      );
      // Type inside the debounce window, then delete before it elapses.
      fireEvent.change(screen.getByPlaceholderText('Note Title'), {
        target: { value: 'Half-typed' },
      });
      fireEvent.click(screen.getByRole('button', { name: /delete note/i }));

      // Advance well past the autosave delay: the debounced PATCH must be cancelled.
      vi.advanceTimersByTime(2000);

      expect(deleteMutate).toHaveBeenCalledWith(100, expect.anything());
      expect(updateMutate).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });

  it('does not delete when the confirm is dismissed', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    render(<NoteEditor note={makeNote()} categories={categories} onClose={vi.fn()} />);

    await userEvent.click(screen.getByRole('button', { name: /delete note/i }));

    expect(deleteMutate).not.toHaveBeenCalled();
  });

  it('merges a rapid title + content edit into a single patch (no lost field)', () => {
    vi.useFakeTimers();
    try {
      render(
        <NoteEditor
          note={makeNote({ title: '', content: '' })}
          categories={categories}
          onClose={vi.fn()}
        />,
      );
      fireEvent.change(screen.getByPlaceholderText('Note Title'), {
        target: { value: 'My Title' },
      });
      fireEvent.change(screen.getByPlaceholderText('Pour your heart out...'), {
        target: { value: 'My body' },
      });
      vi.advanceTimersByTime(700);

      expect(updateMutate).toHaveBeenCalledTimes(1);
      expect(updateMutate).toHaveBeenCalledWith(
        expect.objectContaining({ patch: { title: 'My Title', content: 'My body' } }),
        expect.anything(),
      );
    } finally {
      vi.useRealTimers();
    }
  });
});

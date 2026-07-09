import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NotesWorkspace } from '@/components/NotesWorkspace';
import { categories, notes } from './fixtures';
import { routerMock } from './utils';

/** Click a sidebar category row by name (scoped to the Categories nav so it
 * never collides with a note card that mentions the same category). */
async function clickSidebarCategory(name: RegExp) {
  const sidebar = screen.getByRole('navigation', { name: 'Categories' });
  await userEvent.click(within(sidebar).getByRole('button', { name }));
}

vi.mock('next/navigation', () => ({ useRouter: () => routerMock }));

// Mock the data layer so the test drives category -> notes purely through props.
const useNotesMock = vi.fn();
vi.mock('@/lib/queries', () => ({
  useCategories: () => ({ data: categories, isLoading: false }),
  useNotes: (categoryId: number | null) => useNotesMock(categoryId),
  useCreateNote: () => ({ mutate: vi.fn(), isPending: false }),
  useLogout: () => ({ mutateAsync: vi.fn() }),
}));

describe('NotesWorkspace category filter', () => {
  beforeEach(() => {
    useNotesMock.mockReset();
    // Return only the notes matching the active category (null = all).
    useNotesMock.mockImplementation((categoryId: number | null) => ({
      data: categoryId === null ? notes : notes.filter((n) => n.category === categoryId),
      isLoading: false,
      isError: false,
    }));
  });

  it('shows all notes initially', () => {
    render(<NotesWorkspace />);
    expect(screen.getByRole('heading', { name: 'Buy groceries' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Physics homework' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Random idea' })).toBeInTheDocument();
  });

  it('filters the visible notes when a category is selected', async () => {
    render(<NotesWorkspace />);

    // Click the "School" sidebar row (category id 2).
    await clickSidebarCategory(/School/);

    // Only the School note remains.
    expect(screen.getByRole('heading', { name: 'Physics homework' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Buy groceries' })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Random idea' })).not.toBeInTheDocument();
    // The hook was called with the selected category id.
    expect(useNotesMock).toHaveBeenCalledWith(2);
  });

  it('shows the empty state for a category with no notes', async () => {
    render(<NotesWorkspace />);
    // "Drama" (id 4) has no notes in the fixture.
    await clickSidebarCategory(/Drama/);
    expect(screen.getByText(/waiting for your charming notes/i)).toBeInTheDocument();
  });
});

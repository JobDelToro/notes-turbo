import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { CategorySidebar } from '@/components/CategorySidebar';
import { categories } from './fixtures';

// Category counts in the fixture sum to 6 (2 + 1 + 3 + 0).
const SUM_OF_CATEGORY_COUNTS = 6;

function rowFor(label: string) {
  return screen.getByRole('button', { name: new RegExp(label, 'i') });
}

describe('CategorySidebar — All Categories total', () => {
  it('shows the provided total (which includes uncategorized notes)', () => {
    // 6 categorized + 1 uncategorized = 7 notes in the "All Notes" view.
    render(
      <CategorySidebar
        categories={categories}
        selectedId={null}
        onSelect={vi.fn()}
        totalCount={7}
      />,
    );

    const allRow = rowFor('All Categories');
    expect(within(allRow).getByText('7')).toBeInTheDocument();
    // Not the sum of per-category counts, which would miss the uncategorized note.
    expect(within(allRow).queryByText(String(SUM_OF_CATEGORY_COUNTS))).not.toBeInTheDocument();
  });

  it('falls back to summing category counts when no total is given', () => {
    render(<CategorySidebar categories={categories} selectedId={null} onSelect={vi.fn()} />);

    const allRow = rowFor('All Categories');
    expect(within(allRow).getByText(String(SUM_OF_CATEGORY_COUNTS))).toBeInTheDocument();
  });
});

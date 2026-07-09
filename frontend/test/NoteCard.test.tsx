import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NoteCard } from '@/components/NoteCard';
import { makeNote } from './fixtures';

/**
 * jsdom's CSSOM normalizes inline hex colors to `rgb()` / `rgba()`. Convert an
 * `#RRGGBB` value (with optional alpha) to that form so assertions are robust
 * to serialization rather than pinned to a specific string format.
 */
function hexToCss(hex: string, alpha?: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return alpha === undefined ? `rgb(${r}, ${g}, ${b})` : `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

describe('NoteCard', () => {
  it('renders the note title and category name', () => {
    render(<NoteCard note={makeNote({ title: 'Beach trip' })} onOpen={vi.fn()} />);
    expect(screen.getByRole('heading', { name: 'Beach trip' })).toBeInTheDocument();
    expect(screen.getByText('Personal')).toBeInTheDocument();
  });

  it('applies the category color as border and 50%-alpha fill', () => {
    render(
      <NoteCard
        note={makeNote({
          category_detail: { id: 3, name: 'Personal', color: '#78ABA8' },
        })}
        onOpen={vi.fn()}
      />,
    );
    const card = screen.getByRole('button');
    // Border is the raw category color; the fill is that color at 50% alpha.
    expect(card.style.borderColor).toBe(hexToCss('#78ABA8'));
    expect(card.style.backgroundColor).toBe(hexToCss('#78ABA8', 0.5));
  });

  it('falls back to the uncategorized color when there is no category', () => {
    render(
      <NoteCard note={makeNote({ category: null, category_detail: null })} onOpen={vi.fn()} />,
    );
    expect(screen.getByText('Uncategorized')).toBeInTheDocument();
    expect(screen.getByRole('button').style.borderColor).toBe(hexToCss('#957139'));
  });

  it('calls onOpen with the note when clicked', async () => {
    const onOpen = vi.fn();
    const note = makeNote({ id: 42, title: 'Clickable' });
    render(<NoteCard note={note} onOpen={onOpen} />);
    await userEvent.click(screen.getByRole('button'));
    expect(onOpen).toHaveBeenCalledWith(note);
  });
});

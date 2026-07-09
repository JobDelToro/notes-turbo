import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CategoryDropdown } from '@/components/CategoryDropdown';
import { categories } from './fixtures';

describe('CategoryDropdown', () => {
  it('lists the Uncategorized option plus all four categories when opened', async () => {
    render(<CategoryDropdown categories={categories} value={null} onChange={vi.fn()} />);

    await userEvent.click(screen.getByRole('button', { name: /choose a category/i }));

    const listbox = screen.getByRole('listbox');
    const options = within(listbox).getAllByRole('option');
    expect(options).toHaveLength(5);
    expect(options.map((o) => o.textContent)).toEqual([
      'Uncategorized',
      'Random Thoughts',
      'School',
      'Personal',
      'Drama',
    ]);
  });

  it('calls onChange with null when Uncategorized is chosen', async () => {
    const onChange = vi.fn();
    render(<CategoryDropdown categories={categories} value={3} onChange={onChange} />);

    await userEvent.click(screen.getByRole('button', { name: /personal/i }));
    await userEvent.click(screen.getByRole('option', { name: 'Uncategorized' }));

    expect(onChange).toHaveBeenCalledWith(null);
  });

  it('shows the selected category label and dot when a value is set', () => {
    render(<CategoryDropdown categories={categories} value={3} onChange={vi.fn()} />);
    expect(screen.getByRole('button', { name: /personal/i })).toBeInTheDocument();
  });

  it('calls onChange with the chosen category id', async () => {
    const onChange = vi.fn();
    render(<CategoryDropdown categories={categories} value={null} onChange={onChange} />);

    await userEvent.click(screen.getByRole('button', { name: /choose a category/i }));
    await userEvent.click(screen.getByRole('option', { name: 'School' }));

    expect(onChange).toHaveBeenCalledWith(2);
  });

  it('closes the menu after a selection', async () => {
    render(<CategoryDropdown categories={categories} value={null} onChange={vi.fn()} />);
    await userEvent.click(screen.getByRole('button', { name: /choose a category/i }));
    expect(screen.getByRole('listbox')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('option', { name: 'Drama' }));
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });
});

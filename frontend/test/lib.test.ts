import { describe, expect, it } from 'vitest';
import {
  cardColorStyle,
  categoryColor,
  overCream,
  UNCATEGORIZED_COLOR,
  withAlpha,
} from '@/lib/categoryColor';
import { formatCardDate, formatLastEdited } from '@/lib/format';
import { credentialsSchema, NoteSchema } from '@/lib/schemas';

describe('categoryColor helpers', () => {
  it('returns the category color when present', () => {
    expect(categoryColor({ id: 1, name: 'Personal', color: '#78ABA8' })).toBe('#78ABA8');
  });

  it('falls back to the palette by name when color is empty', () => {
    expect(categoryColor({ id: 1, name: 'School', color: '' })).toBe('#FCDC94');
  });

  it('uses the uncategorized color for null', () => {
    expect(categoryColor(null)).toBe(UNCATEGORIZED_COLOR);
  });

  it('appends an 8-bit alpha suffix', () => {
    expect(withAlpha('#78ABA8', 0.5)).toBe('#78ABA880');
    expect(withAlpha('#000000', 1)).toBe('#000000ff');
    expect(withAlpha('#000000', 0)).toBe('#00000000');
  });

  it('leaves non #RRGGBB inputs untouched', () => {
    expect(withAlpha('rgb(1,2,3)', 0.5)).toBe('rgb(1,2,3)');
  });

  it('builds a card style with fill + border', () => {
    const style = cardColorStyle({ id: 1, name: 'Drama', color: '#C8CFA0' });
    expect(style).toEqual({ backgroundColor: '#C8CFA080', borderColor: '#C8CFA0' });
  });

  it('composites a color over cream into an opaque hex (no bleed-through)', () => {
    expect(overCream('#78ABA8', 0.5)).toBe('#b7cdc2');
    expect(overCream('#78ABA8', 1)).toBe('#78aba8'); // alpha 1 → the color itself
    expect(overCream('#F5EEDC', 0.5)).toBe('#f5eedc'); // cream over cream is a no-op
    expect(overCream('rgb(1,2,3)', 0.5)).toBe('rgb(1,2,3)');
  });
});

describe('format helpers', () => {
  it('formats the last-edited stamp', () => {
    // 2026-07-06 15:07 local — assert the shape rather than an exact tz.
    const out = formatLastEdited('2026-07-06T15:07:00');
    expect(out).toMatch(/^July 6, 2026 at \d{1,2}:07(am|pm)$/);
  });

  it('formats a short card date', () => {
    expect(formatCardDate('2026-07-06T15:07:00')).toBe('Jul 6, 2026');
  });

  it('returns empty string for an invalid date', () => {
    expect(formatLastEdited('nonsense')).toBe('');
  });
});

describe('schemas', () => {
  it('parses a valid note', () => {
    const note = {
      id: 1,
      title: 'x',
      content: 'y',
      category: null,
      category_detail: null,
      created_at: '2026-07-06T15:07:00Z',
      updated_at: '2026-07-06T15:07:00Z',
    };
    expect(NoteSchema.parse(note)).toEqual(note);
  });

  it('rejects bad credentials', () => {
    const result = credentialsSchema.safeParse({ email: 'bad', password: 'x' });
    expect(result.success).toBe(false);
  });
});

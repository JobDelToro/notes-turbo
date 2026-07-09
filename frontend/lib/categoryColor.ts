/**
 * Category color helpers.
 *
 * The API is the source of truth for a category's hex color, but notes can be
 * uncategorized (null). This module centralizes the fallback and the "fill at
 * 50% alpha" rule from the design so cards, dots and the editor stay in sync.
 */
import type { CategoryMini } from './schemas';

/** Neutral gold used when a note has no category yet. */
export const UNCATEGORIZED_COLOR = '#957139';

/** Canonical palette, keyed by the seeded category names (used as a fallback). */
export const CATEGORY_PALETTE: Record<string, string> = {
  'Random Thoughts': '#EF9C66',
  School: '#FCDC94',
  Personal: '#78ABA8',
  Drama: '#C8CFA0',
};

/** Resolve the base hex color for a (possibly null) category. */
export function categoryColor(category: CategoryMini | null | undefined): string {
  if (!category) return UNCATEGORIZED_COLOR;
  if (category.color) return category.color;
  return CATEGORY_PALETTE[category.name] ?? UNCATEGORIZED_COLOR;
}

/**
 * Return the same color with an 8-bit alpha suffix (`#RRGGBBAA`).
 * `alpha` is 0..1; the design uses 0.5 for card and dot fills.
 * Non-`#RRGGBB` inputs are returned unchanged (defensive).
 */
export function withAlpha(hex: string, alpha: number): string {
  const normalized = hex.trim();
  if (!/^#[0-9a-fA-F]{6}$/.test(normalized)) return normalized;
  const clamped = Math.max(0, Math.min(1, alpha));
  const alphaHex = Math.round(clamped * 255)
    .toString(16)
    .padStart(2, '0');
  return `${normalized}${alphaHex}`;
}

/** Inline style for a note card: 50%-alpha fill + 3px solid border. */
export function cardColorStyle(category: CategoryMini | null | undefined): {
  backgroundColor: string;
  borderColor: string;
} {
  const base = categoryColor(category);
  return {
    backgroundColor: withAlpha(base, 0.5),
    borderColor: base,
  };
}

/** The page's cream background — the base every translucent fill sits on. */
export const CREAM = '#F5EEDC';

/**
 * Composite `hex` at `alpha` over the cream page and return an OPAQUE color.
 * Matches the "50% over cream" look of the cards, but without letting anything
 * bleed through — used for the editor overlay, which sits above the grid.
 */
export function overCream(hex: string, alpha = 0.5): string {
  const match = /^#([0-9a-fA-F]{2})([0-9a-fA-F]{2})([0-9a-fA-F]{2})$/.exec(hex.trim());
  if (!match) return hex;
  const cream = [0xf5, 0xee, 0xdc];
  const a = Math.max(0, Math.min(1, alpha));
  const mixed = [1, 2, 3].map((i) => {
    const channel = parseInt(match[i], 16);
    return Math.round(channel * a + cream[i - 1] * (1 - a));
  });
  return '#' + mixed.map((c) => c.toString(16).padStart(2, '0')).join('');
}

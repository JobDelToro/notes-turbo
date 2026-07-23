'use client';

import { motion } from 'motion/react';
import type { Category } from '@/lib/schemas';
import { categoryColor } from '@/lib/categoryColor';
import { cn } from '@/lib/cn';
import { Logomark } from './illustrations/Logomark';

export interface CategorySidebarProps {
  categories: Category[];
  /** Currently selected category id, or null for "All". */
  selectedId: number | null;
  onSelect: (categoryId: number | null) => void;
  isLoading?: boolean;
  /** Total notes for the "All" chip (includes uncategorized). */
  totalCount?: number;
}

/**
 * Category navigation. Mobile-first: a horizontal, thumb-scrollable pill bar at
 * the top; on `lg` it becomes a fixed 288px left rail. The active pill's
 * background is a single shared element (`layoutId`) that springs between pills.
 */
export function CategorySidebar({
  categories,
  selectedId,
  onSelect,
  isLoading,
  totalCount,
}: CategorySidebarProps) {
  const allCount = totalCount ?? categories.reduce((sum, c) => sum + c.note_count, 0);

  return (
    <nav
      aria-label="Categories"
      data-tour="categories"
      className={cn(
        'flex shrink-0 gap-2 overflow-x-auto px-4 py-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
        'lg:w-72 lg:flex-col lg:gap-1 lg:overflow-visible lg:border-r lg:border-border lg:px-4 lg:py-8',
      )}
    >
      <div className="mb-5 hidden items-center gap-2.5 px-2 lg:flex">
        <Logomark size={30} />
        <span className="font-display text-lg font-extrabold tracking-tight text-ink">Notes</span>
      </div>

      <p className="hidden px-2 pb-2 text-xs font-semibold uppercase tracking-wider text-ink-muted lg:block">
        Categories
      </p>

      <Chip
        label="All"
        count={allCount}
        active={selectedId === null}
        onClick={() => onSelect(null)}
      />

      {isLoading && categories.length === 0
        ? Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="skeleton h-9 w-24 shrink-0 rounded-full lg:h-10 lg:w-full" />
          ))
        : categories.map((category) => (
            <Chip
              key={category.id}
              label={category.name}
              count={category.note_count}
              color={categoryColor(category)}
              active={selectedId === category.id}
              onClick={() => onSelect(category.id)}
            />
          ))}
    </nav>
  );
}

function Chip({
  label,
  count,
  color,
  active,
  onClick,
}: {
  label: string;
  count: number;
  color?: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? 'true' : undefined}
      className={cn(
        'relative flex h-9 shrink-0 items-center gap-2 rounded-full px-3.5 text-sm transition-colors lg:h-10 lg:px-3',
        active ? 'text-ink' : 'text-ink-muted hover:bg-surface-2 hover:text-ink',
      )}
    >
      {active ? (
        <motion.span
          layoutId="cat-active"
          aria-hidden
          className="absolute inset-0 -z-10 rounded-full bg-surface-2 shadow-[var(--shadow-sm)]"
          transition={{ type: 'spring', stiffness: 400, damping: 32 }}
        />
      ) : null}

      {color ? (
        <span
          aria-hidden
          className="h-2.5 w-2.5 shrink-0 rounded-full"
          style={{ backgroundColor: color }}
        />
      ) : (
        <span aria-hidden className="h-2.5 w-2.5 shrink-0 rounded-full border border-border" />
      )}
      <span className="truncate font-medium lg:flex-1">{label}</span>
      <span className="text-xs tabular-nums text-ink-muted/80">{count}</span>
    </button>
  );
}

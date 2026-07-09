'use client';

import type { Category } from '@/lib/schemas';
import { cn } from '@/lib/cn';

export interface CategorySidebarProps {
  categories: Category[];
  /** Currently selected category id, or null for "All Categories". */
  selectedId: number | null;
  onSelect: (categoryId: number | null) => void;
  isLoading?: boolean;
  /**
   * Total note count for the "All Categories" row. Includes uncategorized notes,
   * which aren't in any category's count. Falls back to summing category counts.
   */
  totalCount?: number;
}

/**
 * Left navigation (288px). "All Categories" header, then one row per category
 * with a colored dot, the name, and the note count aligned right. Clicking a
 * row filters the grid.
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
      className="flex shrink-0 gap-1 overflow-x-auto border-b border-gold/10 px-4 py-3 lg:w-72 lg:flex-col lg:overflow-x-visible lg:border-b-0 lg:py-6"
    >
      <SidebarRow
        label="All Categories"
        count={allCount}
        isHeader
        isActive={selectedId === null}
        onClick={() => onSelect(null)}
      />

      {isLoading && categories.length === 0
        ? Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-8 w-28 shrink-0 animate-pulse rounded-md bg-gold/10 lg:w-full"
            />
          ))
        : categories.map((category) => (
            <SidebarRow
              key={category.id}
              label={category.name}
              count={category.note_count}
              color={category.color}
              isActive={selectedId === category.id}
              onClick={() => onSelect(category.id)}
            />
          ))}
    </nav>
  );
}

function SidebarRow({
  label,
  count,
  color,
  isHeader,
  isActive,
  onClick,
}: {
  label: string;
  count: number;
  color?: string;
  isHeader?: boolean;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={isActive ? 'true' : undefined}
      className={cn(
        'flex h-8 shrink-0 items-center gap-2 rounded-md px-3 text-left transition-colors lg:px-2',
        'hover:bg-gold/10',
        isActive && 'bg-gold/15',
      )}
    >
      {color ? (
        <span
          aria-hidden
          className="inline-block h-[11px] w-[11px] shrink-0 rounded-full"
          style={{ backgroundColor: color }}
        />
      ) : (
        <span aria-hidden className="inline-block h-[11px] w-[11px] shrink-0" />
      )}
      <span
        className={cn('truncate text-ink lg:flex-1', isHeader ? 'text-sm font-bold' : 'text-sm')}
      >
        {label}
      </span>
      <span className="text-xs tabular-nums text-ink/60">{count}</span>
    </button>
  );
}

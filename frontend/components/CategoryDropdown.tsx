'use client';

import { useEffect, useId, useRef, useState } from 'react';
import type { Category } from '@/lib/schemas';
import { categoryColor, UNCATEGORIZED_COLOR } from '@/lib/categoryColor';
import { cn } from '@/lib/cn';
import { ChevronDownIcon } from './icons';

export interface CategoryDropdownProps {
  categories: Category[];
  /** Selected category id, or null when uncategorized. */
  value: number | null;
  onChange: (categoryId: number | null) => void;
  className?: string;
}

/** Rows in the menu: an "Uncategorized" (null) entry followed by the categories. */
type Option = { id: number | null; name: string; color: string };

/**
 * Category selector for the note editor. Closed state matches the field spec
 * (1px gold border, radius 6px, 39px tall, 11px dot). The open menu is a
 * ~225px surface panel with 32px rows. Fully keyboard-navigable.
 */
export function CategoryDropdown({
  categories,
  value,
  onChange,
  className,
}: CategoryDropdownProps) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const listboxId = useId();

  // The "Uncategorized" row sits at the top (value null, neutral gold dot).
  const options: Option[] = [
    { id: null, name: 'Uncategorized', color: UNCATEGORIZED_COLOR },
    ...categories.map((c) => ({ id: c.id, name: c.name, color: categoryColor(c) })),
  ];

  const selected = categories.find((c) => c.id === value) ?? null;
  const label = selected?.name ?? 'Choose a category';
  const dotColor = selected ? categoryColor(selected) : undefined;

  // Close on outside click. Inlined (rather than calling `closeMenu`) so the
  // effect's only dependency is `open`; an outside click also returns focus to
  // the trigger.
  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: PointerEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
        buttonRef.current?.focus();
      }
    }
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [open]);

  // Move focus into the list once, when it opens — keyed on `open` so hovering a
  // row (which re-renders) never steals focus back to the list.
  useEffect(() => {
    if (open) listRef.current?.focus();
  }, [open]);

  // Open the menu and highlight the currently-selected row. Setting both pieces
  // of state together (rather than in an effect) keeps the highlight in sync
  // without a cascading render.
  function openMenu() {
    const idx = options.findIndex((o) => o.id === value);
    setActiveIndex(idx >= 0 ? idx : 0);
    setOpen(true);
  }

  // Close and return focus to the trigger so keyboard users aren't stranded.
  function closeMenu() {
    setOpen(false);
    buttonRef.current?.focus();
  }

  function commit(index: number) {
    const option = options[index];
    if (option) {
      onChange(option.id);
      closeMenu();
    }
  }

  function toggleMenu() {
    if (open) closeMenu();
    else openMenu();
  }

  function onButtonKeyDown(event: React.KeyboardEvent) {
    if (event.key === 'ArrowDown' || event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      openMenu();
    }
  }

  function onListKeyDown(event: React.KeyboardEvent) {
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        setActiveIndex((i) => Math.min(i + 1, options.length - 1));
        break;
      case 'ArrowUp':
        event.preventDefault();
        setActiveIndex((i) => Math.max(i - 1, 0));
        break;
      case 'Enter':
      case ' ':
        event.preventDefault();
        commit(activeIndex);
        break;
      case 'Escape':
        event.preventDefault();
        closeMenu();
        break;
      case 'Tab':
        closeMenu();
        break;
    }
  }

  return (
    <div ref={containerRef} className={cn('relative w-[225px]', className)}>
      <button
        ref={buttonRef}
        type="button"
        onClick={toggleMenu}
        onKeyDown={onButtonKeyDown}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={cn(
          'flex h-[39px] w-full items-center gap-2 rounded-[6px] border border-gold',
          'bg-transparent px-[15px] py-[7px] text-xs text-ink',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-gold/60',
        )}
      >
        {dotColor ? (
          <span
            aria-hidden
            className="inline-block h-[11px] w-[11px] shrink-0 rounded-full"
            style={{ backgroundColor: dotColor }}
          />
        ) : null}
        <span className={cn('flex-1 truncate text-left', !selected && 'text-ink-muted')}>
          {label}
        </span>
        <ChevronDownIcon size={16} className="shrink-0 text-gold" />
      </button>

      {open ? (
        <ul
          id={listboxId}
          role="listbox"
          aria-activedescendant={`${listboxId}-opt-${activeIndex}`}
          tabIndex={-1}
          ref={listRef}
          onKeyDown={onListKeyDown}
          className="absolute z-20 mt-1 w-[225px] overflow-hidden rounded-[8px] bg-surface py-1 shadow-lg ring-1 ring-black/5 focus:outline-none"
        >
          {options.map((option, index) => {
            const isSelected = option.id === value;
            const isActive = index === activeIndex;
            return (
              <li
                key={option.id ?? 'uncategorized'}
                id={`${listboxId}-opt-${index}`}
                role="option"
                aria-selected={isSelected}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => commit(index)}
                className={cn(
                  'flex h-8 cursor-pointer items-center gap-2 px-4 text-xs text-ink',
                  isActive && 'bg-gold/10',
                  isSelected && 'font-semibold',
                )}
              >
                <span
                  aria-hidden
                  className="inline-block h-[11px] w-[11px] shrink-0 rounded-full"
                  style={{ backgroundColor: option.color }}
                />
                <span className="truncate">{option.name}</span>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}

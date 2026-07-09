# Design Tokens

> The single source of truth for the Notes UI, taken from the Figma spec. "Warm paper": cream surfaces, one gold accent,
> serif display over a clean sans body, category colour as the only saturated colour on screen.
> Owner: Job · Updated 2026-07-08. These mirror the Tailwind 4 `@theme` in `frontend/app/globals.css`.

---

## Color

| Token       | Hex       | Utility (Tailwind 4)        | Usage                                      |
| ----------- | --------- | --------------------------- | ------------------------------------------ |
| `cream`     | `#F5EEDC` | `bg-cream`                  | App background (warm paper)                |
| `surface`   | `#FAF1E3` | `bg-surface`                | Cards, sidebar, dropdown surface           |
| `gold`      | `#957139` | `text-gold` / `border-gold` | Accent — button text, input borders, focus |
| `ink`       | `#1A1A1A` | `text-ink`                  | Primary text                               |
| `ink-muted` | `#6B6459` | `text-ink-muted`            | Secondary text / placeholders              |

### Category colors (the only saturated colour on screen — used as the note's tag/swatch)

| Category        | Hex       |
| --------------- | --------- |
| Random Thoughts | `#EF9C66` |
| School          | `#FCDC94` |
| Personal        | `#78ABA8` |
| Drama           | `#C8CFA0` |

> These four are also the seeded categories created per user on signup (see
> [architecture.md](./architecture.md) §2 and [adr/ADR-003-data-model.md](./adr/ADR-003-data-model.md)).

## Typography

| Family          | Role                          |
| --------------- | ----------------------------- |
| **Inria Serif** | Display / note-card titles    |
| **Inter**       | Body, labels, buttons, inputs |

- Note-card title: **Inria Serif, Bold, 24**.
- Button label: **Inter, Bold, 16**, color `#957139`.

## Components

### Note card

| Property      | Value                                |
| ------------- | ------------------------------------ |
| Border radius | `11`                                 |
| Border width  | `3`                                  |
| Padding       | `16`                                 |
| Gap           | `12`                                 |
| Shadow        | `1px 1px 2px rgba(0,0,0,.25)`        |
| Title         | Inria Serif Bold 24                  |
| Timestamp     | `updated_at`, labelled "Last Edited" |

### Button (pill)

| Property      | Value         |
| ------------- | ------------- |
| Border radius | `46`          |
| Height        | `43`          |
| Text color    | `#957139`     |
| Font          | Inter Bold 16 |

### Input

| Property      | Value     |
| ------------- | --------- |
| Border radius | `6`       |
| Height        | `39`      |
| Border color  | `#957139` |

### Layout

| Element  | Value                         |
| -------- | ----------------------------- |
| Sidebar  | width `288px`                 |
| Dropdown | surface `#FAF1E3`, radius `8` |

## Tailwind 4 mapping (reference)

This is the actual `@theme` in `frontend/app/globals.css` — the doc mirrors the code, not the other way round:

```css
@theme {
  /* Fonts — bound to the next/font CSS variables set on <html>. */
  --font-serif: var(--font-inria-serif), Georgia, 'Times New Roman', serif;
  --font-sans: var(--font-inter), ui-sans-serif, system-ui, sans-serif;

  /* Surfaces & brand */
  --color-cream: #f5eedc; /* page background */
  --color-surface: #faf1e3; /* popover / menu / dropdown */
  --color-gold: #957139; /* input & button borders, button text */
  --color-ink: #1a1a1a; /* near-black text */
  --color-ink-muted: #6b6459; /* secondary text / placeholders */

  /* Category palette (base hue; fills applied at 50% alpha at runtime) */
  --color-cat-random: #ef9c66;
  --color-cat-school: #fcdc94;
  --color-cat-personal: #78aba8;
  --color-cat-drama: #c8cfa0;

  --shadow-card: 1px 1px 2px rgba(0, 0, 0, 0.25);

  --radius-card: 11px; /* note card */
  --radius-pill: 46px; /* buttons */
  --radius-field: 6px; /* inputs */
  --radius-menu: 8px; /* dropdown */
}
```

> Runtime category colours (from the API) are applied inline via `lib/categoryColor.ts` (50% alpha over cream);
> the `@theme` category tokens exist so static classes like `bg-cat-personal` are available.

## Accessibility notes

- Category tints are light; when text sits on them, verify contrast (WCAG AA) or use the colour only as a swatch/border.
- Focus ring uses the gold accent and must be visible on the cream surfaces. Respect `prefers-reduced-motion`.

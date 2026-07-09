---
description: 'Activate Designer mode for UI/UX, the design system, and accessibility'
---

Switch to UX/UI DESIGNER mode.

## Design Philosophy: warm paper

A calm, warm, paper-like notebook. Cream backgrounds, a single gold accent, serif display type over a clean sans body.
Category colour is the only strong colour on screen — it tags notes, nothing else competes with it.
Full token reference (authoritative): `docs/design-tokens.md`.

## Color System

| Token     | Value     | Usage                               |
| --------- | --------- | ----------------------------------- |
| `bg`      | `#F5EEDC` | App background (warm paper)         |
| `surface` | `#FAF1E3` | Cards, sidebar, dropdown surface    |
| `gold`    | `#957139` | Accent: buttons text, input borders |
| `text`    | `#1a1a1a` | Primary text                        |

### Category colours (the only saturated colour on screen)

| Category        | Hex       |
| --------------- | --------- |
| Random Thoughts | `#EF9C66` |
| School          | `#FCDC94` |
| Personal        | `#78ABA8` |
| Drama           | `#C8CFA0` |

## Typography

- **Inria Serif** — display / note titles (Bold 24 for a note card title).
- **Inter** — body, labels, buttons (Bold 16 for button text).

## Component tokens

- **Note card**: radius 11, border 3, padding 16, gap 12, shadow `1px 1px 2px rgba(0,0,0,.25)`; title Inria Serif Bold 24.
- **Button**: pill radius 46, height 43, text `#957139`, Inter Bold 16.
- **Input**: radius 6, height 39, border `#957139`.
- **Sidebar**: width 288px. **Dropdown**: surface `#FAF1E3`, radius 8.

## Accessibility (WCAG 2.1 AA)

- Check text contrast on the cream surfaces; darken a category tint or use it only as a swatch/border if text sits on it.
- Keyboard: every control reachable via Tab, activatable via Enter/Space; visible focus ring (use the gold accent).
- Labels: real `<label>`s tied to inputs; `aria-label` on icon-only buttons; `alt` on images.
- Touch targets ≥ 44×44px. Respect `prefers-reduced-motion`.

## Design Rules

- Every state designed: empty (no notes yet), loading, error, success.
- Micro-interactions on every interactive element: hover, focus, active, disabled.
- Forms: inline validation with clear, specific messages.
- Timestamps: show `updated_at` as **"Last Edited"** on note cards.

$ARGUMENTS

# 07 — Design System  **(FROZEN)**

Tokens live in `web/src/styles/tokens.css`. **No hex literal ever appears in a component file.**

## 1. Colour tokens

```css
:root {
  color-scheme: light;

  /* brand — structure, navigation, links */
  --brand-900: #0b2545;
  --brand-700: #13315c;   /* top bar */
  --brand-600: #1d4ed8;   /* primary buttons, links */
  --brand-500: #3b82f6;   /* hover, focus ring */
  --brand-100: #dbeafe;   /* selected rows, info panels */
  --brand-050: #eff6ff;

  /* accent — the single call to action per screen */
  --accent-500: #f59e0b;
  --accent-600: #d97706;
  --accent-050: #fffbeb;

  /* ink */
  --ink-900: #111827;     /* body text */
  --ink-700: #374151;     /* secondary */
  --ink-600: #4b5563;     /* muted but readable */
  --ink-500: #6b7280;     /* placeholders, disabled labels */
  --ink-300: #d1d5db;     /* borders */
  --ink-200: #e5e7eb;     /* dividers */
  --ink-100: #f3f4f6;     /* page background */
  --ink-050: #f9fafb;
  --white:   #ffffff;

  /* status */
  --ok-700:     #15803d;  --ok-050:     #f0fdf4;   /* completed, fresh source */
  --warn-700:   #b45309;  --warn-050:   #fffbeb;   /* blocked, ageing source */
  --danger-700: #b91c1c;  --danger-050: #fef2f2;   /* errors, stale source */
  --info-700:   #1d4ed8;  --info-050:   #eff6ff;   /* available, informational */
  --neutral-700:#374151;                            /* not applicable */

  --focus: #3b82f6;
}
```

## 2. Type, radius, shadow

Declare these inside Tailwind v4's `@theme static { … }` block, **not** in `:root`. Declaring them in both makes the alias self-referential and silently breaks every `rounded-*`, `shadow-*` and `font-*` utility.

```
--font-sans: "Segoe UI", system-ui, -apple-system, "Helvetica Neue", Arial, sans-serif;
--radius-sm: 4px;  --radius-md: 6px;  --radius-lg: 10px;  --radius-pill: 999px;
--shadow-card:  0 1px 2px rgb(17 24 39 / 0.06), 0 1px 3px rgb(17 24 39 / 0.10);
--shadow-hover: 0 4px 6px rgb(17 24 39 / 0.07), 0 2px 4px rgb(17 24 39 / 0.06);
```

Scale: 12 / 14 / 16 / 20 / 24 / 32 px. Body 16. Weights 400, 600, 700 only.
Spacing: multiples of 4 only.

## 3. Components (M1 builds exactly these)

| Component | Variants / props | Notes |
|---|---|---|
| `Button` | primary, secondary, ghost, danger; sm/md/lg; `loading`, `fullWidth` | primary is amber `--accent-500` with `--ink-900` text; **one per screen** |
| `Chip` | neutral / ok / warn / danger / info; optional icon | |
| `StatusChip` | takes a `StepStatus` or `SourceHealth` | colour + text from `labels.ts`; unknown → neutral chip with the raw string, never a crash |
| `Input` | label, helper, error, required, prefix/suffix | real `<label htmlFor>`, `aria-invalid`, `aria-describedby` |
| `Select` | same shape as `Input`, plus options | |
| `Skeleton` | card / row / text | 1.2s shimmer; static under `prefers-reduced-motion` |
| `EmptyState` | icon, title, body, ≤2 CTAs | |
| `ErrorState` | message, code, `onRetry` | shows the `ApiErrorCode`, useful in a demo |
| `SourceLink` | url, verifiedOn | renders "Official source · verified 26 Sep" with an external-link icon |
| `StepNode` | roadmap graph node | title, status chip, fee, days; greyed when blocked |

Icons: **lucide-react only**.

## 4. Status mapping

| Value | Chip variant |
|---|---|
| `AVAILABLE` | info |
| `BLOCKED` | warn |
| `COMPLETED` | ok |
| `NOT_APPLICABLE` | neutral |
| `FRESH` | ok |
| `AGEING` | warn |
| `STALE` | danger |

Status is always **icon + text**, never colour alone. An unknown value renders a neutral chip with the raw string.

## 5. Graph conventions

- Stages are columns left to right, or rows on narrow screens.
- A blocked node is at 60% opacity with a dashed border.
- An edge is labelled with a short reason; the full sentence appears on hover and in the step panel.
- The critical path is drawn thicker, not in a different colour (colour is reserved for status).
- Completing a step animates its unlocked successors once, briefly. **Exactly one** animation in the product; anything more is noise.

## 6. Copy rules

- Sentence case everywhere. No Title Case headings.
- Say: step, blocked, ready to start, document, office, fee, official source.
- Never say: task complete!, congrats, AI-powered, guaranteed, approved.
- Never state a fact without its source link beside it.
- Disclaimer, once in the footer, exactly: *"Guidance assembled from official sources. Always confirm on the linked government page before applying."*

## 7. Accessibility

Visible 2px focus ring on every interactive element; `outline: none` is never acceptable. Contrast ≥ 4.5:1 for body text. The graph must be usable by keyboard: steps are also listed in a reachable stage-ordered list beneath it.

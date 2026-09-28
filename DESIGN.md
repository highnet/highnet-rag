---
name: highnet-rag
description: A transparent RAG pipeline worked out on an engineer's computation pad.
colors:
  paper: '#EEF3E4'
  paper-raised: '#F7FAF1'
  grid: '#D6E2C8'
  rule: '#A3B892'
  rule-input: '#76896A'
  graphite: '#232922'
  graphite-muted: '#4F5B4B'
  blue-pencil: '#2D5B9A'
  blue-wash: '#DCE6F1'
  red-check: '#B0261D'
  amber-note: '#855600'
  green-tick: '#2F6B3B'
  data-bm25: '#8A5528'
  data-vector: '#2D5B9A'
  data-fused: '#6A4A99'
  data-rerank: '#3C7747'
  data-neutral: '#4F5B4B'
  lamp-paper: '#121913'
  lamp-paper-raised: '#19221A'
  lamp-grid: '#223025'
  lamp-rule: '#3D5140'
  lamp-rule-input: '#6E8571'
  lamp-graphite: '#E1E9D8'
  lamp-graphite-muted: '#A5B39E'
  lamp-blue-pencil: '#8FB5EA'
  lamp-blue-wash: '#1E2D41'
  lamp-red-check: '#F28B82'
  lamp-amber-note: '#E2B65E'
  lamp-green-tick: '#8CC79A'
  lamp-data-bm25: '#D9A06E'
  lamp-data-vector: '#8FB5EA'
  lamp-data-fused: '#B9A0E6'
  lamp-data-rerank: '#8CC79A'
typography:
  sheet-title:
    fontFamily: 'Recursive, ui-sans-serif, system-ui, sans-serif'
    fontSize: 'clamp(1.5rem, 1.2rem + 1.5vw, 2.25rem)'
    fontWeight: 650
    lineHeight: 1.1
    letterSpacing: '-0.01em'
  step-heading:
    fontFamily: 'Recursive, ui-sans-serif, system-ui, sans-serif'
    fontSize: '1.125rem'
    fontWeight: 600
    lineHeight: 1.3
  body:
    fontFamily: 'Recursive, ui-sans-serif, system-ui, sans-serif'
    fontSize: '1rem'
    fontWeight: 400
    lineHeight: 1.6
  margin-note:
    fontFamily: 'Recursive, ui-sans-serif, system-ui, sans-serif'
    fontSize: '0.9375rem'
    fontWeight: 450
    lineHeight: 1.5
  data:
    fontFamily: 'Recursive, ui-monospace, SFMono-Regular, monospace'
    fontSize: '0.875rem'
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: 'Recursive, ui-monospace, SFMono-Regular, monospace'
    fontSize: '0.75rem'
    fontWeight: 500
    lineHeight: 1.3
    letterSpacing: '0.04em'
rounded:
  none: '0px'
  sm: '2px'
  md: '4px'
spacing:
  hair: '4px'
  cell: '8px'
  square: '20px'
  step: '32px'
  sheet: '64px'
components:
  button-primary:
    backgroundColor: '{colors.blue-pencil}'
    textColor: '{colors.paper}'
    rounded: '{rounded.sm}'
    padding: '8px 16px'
    height: '40px'
  button-quiet:
    backgroundColor: '{colors.paper}'
    textColor: '{colors.graphite}'
    rounded: '{rounded.sm}'
    padding: '8px 12px'
    height: '40px'
  step-sheet:
    backgroundColor: '{colors.paper-raised}'
    textColor: '{colors.graphite}'
    rounded: '{rounded.md}'
    padding: '20px'
  margin-note:
    backgroundColor: '{colors.paper}'
    textColor: '{colors.blue-pencil}'
    typography: '{typography.margin-note}'
  input-field:
    backgroundColor: '{colors.paper-raised}'
    textColor: '{colors.graphite}'
    rounded: '{rounded.sm}'
    height: '44px'
---

<!-- SEED: established with the user before implementation; re-run /impeccable document once there's code to capture the actual tokens and components. -->
<!-- Deviation from Impeccable seed mode, at the owner's request: palette, type and spacing tokens are committed now so they can be mapped onto Tailwind and shadcn before milestone 1. The documenter replaces this file from the built UI at the end of milestone 1. -->

# Design System: highnet-rag

## Overview

**An engineer's computation pad, not a chat window.** Each query is worked out like a calculation on pale-green engineering paper. The query goes in at the top of the sheet, each pipeline stage is one numbered step below it, and the answer is the result at the bottom, drawn from the steps above it. Graphite ink carries everything factual. Blue pencil, the draughtsman's non-photo blue, is the one voice of annotation: "Why this step?" notes, the active control, and the current step. A red check mark means something failed, and it is used for nothing else.

The mood is calm and exact. The grid is a faint presence on the page. It gives numbers and chunks a place to sit, but it never becomes a decoration you notice first. There are no gradients, glass, glows or illustrations; the data is the imagery. The dark theme is the same pad under a drafting lamp: a deep green-black ground, pale graphite and a brighter blue pencil. It is a lighting change, not a different world.

Motion is sparse: a step being written in as its trace event arrives, and a value changing in place when a setting changes. Under `prefers-reduced-motion`, steps appear without transition.

## Colors

The palette is restrained: neutral paper and graphite, with blue pencil as the only accent. A separate data palette is reserved for charts and scores. Light tokens are unprefixed; the dark ("lamp") theme mirrors each role with a `lamp-` prefix. Every text colour meets WCAG AA on both paper and raised paper in its theme, and the data colours reach at least 4.7:1 on paper.

### Primary

- **Blue pencil** (`blue-pencil` / `lamp-blue-pencil`): margin notes, the active step, primary actions, focus rings and links. On a **blue wash** (`blue-wash` / `lamp-blue-wash`) it marks the current selection, for example the chunk being inspected.

### Neutral

- **Paper** (`paper`, `lamp-paper`): the page ground.
- **Raised paper** (`paper-raised`): a step sheet laid on the pad.
- **Grid** (`grid`): the faint 20px squares, decorative only.
- **Rule** (`rule`): dividers and sheet edges; decorative, so below 3:1 on purpose.
- **Input rule** (`rule-input`): borders of interactive controls (at least 3.3:1, meets WCAG 1.4.11).
- **Graphite** (`graphite`): all body text and numbers.
- **Muted graphite** (`graphite-muted`): secondary labels, units and timestamps.

### Semantic

- **Red check** (`red-check`): a stage failed, a citation was not found in the retrieved chunks, or the budget is exhausted.
- **Amber note** (`amber-note`): warnings, such as low retrieval scores, a rate limit coming up, or the fallback to the cheaper model.
- **Green tick** (`green-tick`): a check passed, for example a citation verified.

Semantic colour is always paired with a glyph and a word (✓ passed, ✗ failed, ! warning).

### Data

The data palette gives each retriever a colour, used for series and badges in charts and ranking tables:

- **BM25** (`data-bm25`): umber.
- **Vector** (`data-vector`): blue.
- **Fused, RRF** (`data-fused`): violet.
- **Reranked** (`data-rerank`): green.
- **Everything else** (`data-neutral`).

Each series also carries a distinct marker shape (square, circle, diamond, triangle) and a text label, so colour is never the only cue.

### Named Rules

**The One Pencil Rule.** Blue pencil is the only accent. When something new needs emphasis, use weight, scale or position before adding a colour.

**The Red Means Wrong Rule.** Red appears only for failure. Never use it for brand, highlights or "important".

## Typography

One family, **Recursive**, used through its axes. The linear sans is for prose and headings. The casual axis, half-way (CASL 0.5) with a slight slant, is the hand-lettered voice of blue-pencil margin notes. Mono (MONO 1) is for every number, score, token count, ID and code sample, with tabular figures. Using a single family keeps the pad feeling like one person's handwriting and one instrument's readout.

### Hierarchy

- **Sheet title** (650, clamp 1.5rem→2.25rem): the query, written at the top of the sheet.
- **Step heading** (600, 1.125rem): "Step 3 · Vector search", with the step number in mono.
- **Body** (400, 1rem, line height 1.6, max 68ch): explanations and the answer.
- **Margin note** (450, 0.9375rem, casual and slanted, blue pencil): "Why this step?".
- **Data** (mono 400, 0.875rem, tabular): scores, tokens, milliseconds, cost.
- **Label** (mono 500, 0.75rem, +0.04em tracking): column heads and units. Sentence case, never all caps.

### Named Rules

**The Numbers Are Mono Rule.** Anything measured (score, rank, ms, tokens, $) is set in mono with tabular figures, so columns of numbers line up like a worked calculation.

## Layout

Mobile-first:

- **Phones:** one column. Each step's margin note folds under its heading as an expandable "Why this step?".
- **From `md`, 768px:** the pad gains a left margin rule and step numbers hang in the margin.
- **From `lg`, 1024px:** blue-pencil notes move into a right-hand margin column (about 18rem) beside their step, like annotations on a real pad.
- **Wide screens:** BM25 and vector results sit side by side at `lg` and above, and stack below it.

The 20px grid is the spatial unit: step padding, gaps between steps (32px) and table row heights snap to it. Content width is capped at about 72rem, and prose at 68ch.

## Elevation & Depth

The pad is flat. A step sheet sits above the grid through a 1px rule and a raised-paper fill, never a drop shadow. The only overlays are popovers and dialogs, which use the same raised paper with a single 1px input rule and a very soft 0/8px shadow at 12% graphite. Depth tells you what you can pick up, not how important something is.

## Shapes

Paper corners:

- **2px:** controls.
- **4px:** step sheets.
- **0px:** the pad itself and all tables.

Nothing is pill-shaped except the tokens and chips that represent chunks, which are 2px-rounded rectangles like a label taped onto the pad. Lines are 1px everywhere. A 2px blue-pencil rule marks the active step's left edge.

## Do's and Don'ts

### Do:

- **Do** let real trace data be the only imagery: scores, the 2D map, the prompt, the chunks.
- **Do** keep every measured value in mono with its unit, taken from the actual trace.
- **Do** show states with a glyph and a word as well as colour, in both themes.
- **Do** keep the grid faint enough that a screenshot without it would read the same.

### Don't:

- **Don't** ship default shadcn styling. Every primitive is restyled to these tokens (see `docs/ARCHITECTURE.md` → Design tokens).
- **Don't** use gradients, glassmorphism, glows, neon, or decorative illustrations and icons standing in for data.
- **Don't** turn the paper metaphor into a costume: no torn edges, coffee stains, handwriting fonts or skeuomorphic spiral bindings.
- **Don't** use red for anything except failure, or a second accent colour for emphasis.
- **Don't** hide the evidence behind the answer. Retrieved chunks and scores are visible without extra clicks on desktop, and one tap away on phones.

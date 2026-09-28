---
name: highnet-rag
description: A transparent RAG pipeline worked out on an engineer's computation pad.
colors:
  paper: '#eef3e4'
  paper-raised: '#f7faf1'
  grid: '#d6e2c8'
  rule: '#a3b892'
  rule-input: '#76896a'
  graphite: '#232922'
  graphite-muted: '#4f5b4b'
  blue-pencil: '#2d5b9a'
  blue-wash: '#dce6f1'
  red-check: '#b0261d'
  amber-note: '#855600'
  green-tick: '#2f6b3b'
  data-bm25: '#8a5528'
  data-vector: '#2d5b9a'
  data-fused: '#6a4a99'
  data-rerank: '#3c7747'
  data-neutral: '#4f5b4b'
  lamp-paper: '#121913'
  lamp-paper-raised: '#19221a'
  lamp-grid: '#223025'
  lamp-rule: '#3d5140'
  lamp-rule-input: '#6e8571'
  lamp-graphite: '#e1e9d8'
  lamp-graphite-muted: '#a5b39e'
  lamp-blue-pencil: '#8fb5ea'
  lamp-blue-wash: '#1e2d41'
  lamp-red-check: '#f28b82'
  lamp-amber-note: '#e2b65e'
  lamp-green-tick: '#8cc79a'
  lamp-data-bm25: '#d9a06e'
  lamp-data-vector: '#8fb5ea'
  lamp-data-fused: '#b9a0e6'
  lamp-data-rerank: '#8cc79a'
  lamp-data-neutral: '#a5b39e'
typography:
  sheet-title:
    fontFamily: 'Recursive, ui-sans-serif, system-ui, sans-serif'
    fontSize: 'clamp(1.5rem, 1.2rem + 1.5vw, 2.25rem)'
    fontWeight: 650
    lineHeight: 1.1
    letterSpacing: '-0.01em'
    fontVariation: "'MONO' 0, 'CASL' 0, 'slnt' 0"
  step-heading:
    fontFamily: 'Recursive, ui-sans-serif, system-ui, sans-serif'
    fontSize: '1.125rem'
    fontWeight: 600
    lineHeight: 1.375
    fontVariation: "'MONO' 0, 'CASL' 0, 'slnt' 0"
  answer:
    fontFamily: 'Recursive, ui-sans-serif, system-ui, sans-serif'
    fontSize: '1.125rem'
    fontWeight: 400
    lineHeight: 1.625
    fontVariation: "'MONO' 0, 'CASL' 0, 'slnt' 0"
  body:
    fontFamily: 'Recursive, ui-sans-serif, system-ui, sans-serif'
    fontSize: '1rem'
    fontWeight: 400
    lineHeight: 1.625
    fontVariation: "'MONO' 0, 'CASL' 0, 'slnt' 0"
  small:
    fontFamily: 'Recursive, ui-sans-serif, system-ui, sans-serif'
    fontSize: '0.875rem'
    fontWeight: 400
    lineHeight: 1.5
    fontVariation: "'MONO' 0, 'CASL' 0, 'slnt' 0"
  margin-note:
    fontFamily: 'Recursive, ui-sans-serif, system-ui, sans-serif'
    fontSize: '0.9375rem'
    fontWeight: 450
    lineHeight: 1.5
    fontVariation: "'MONO' 0, 'CASL' 0.5, 'slnt' -7"
  data:
    fontFamily: 'Recursive, ui-monospace, SFMono-Regular, monospace'
    fontSize: '0.875rem'
    fontWeight: 400
    lineHeight: 1.5
    fontFeature: "'tnum' 1, 'zero' 1"
    fontVariation: "'MONO' 1, 'CASL' 0, 'slnt' 0"
  label:
    fontFamily: 'Recursive, ui-monospace, SFMono-Regular, monospace'
    fontSize: '0.75rem'
    fontWeight: 500
    lineHeight: 1.25
    letterSpacing: '0.04em'
    fontFeature: "'tnum' 1, 'zero' 1"
    fontVariation: "'MONO' 1, 'CASL' 0, 'slnt' 0"
  code:
    fontFamily: 'Recursive, ui-monospace, SFMono-Regular, monospace'
    fontSize: '0.75rem'
    fontWeight: 400
    lineHeight: 1.625
    fontFeature: "'tnum' 1, 'zero' 1"
    fontVariation: "'MONO' 1, 'CASL' 0, 'slnt' 0"
rounded:
  none: '0px'
  sm: '2px'
  md: '4px'
spacing:
  square: '20px'
  step-gap: '8px'
  step-gap-md: '16px'
  section: '32px'
  section-md: '40px'
  page-inline: '16px'
  page-inline-md: '32px'
components:
  button-primary:
    backgroundColor: '{colors.blue-pencil}'
    textColor: '{colors.paper}'
    rounded: '{rounded.sm}'
    padding: '0 16px'
    height: '40px'
  button-primary-disabled:
    backgroundColor: '{colors.grid}'
    textColor: '{colors.graphite-muted}'
  button-quiet:
    backgroundColor: '{colors.paper-raised}'
    textColor: '{colors.graphite}'
    rounded: '{rounded.sm}'
    padding: '0 16px'
    height: '40px'
  button-quiet-hover:
    backgroundColor: '{colors.blue-wash}'
  button-quiet-pressed:
    backgroundColor: '{colors.blue-wash}'
    textColor: '{colors.blue-pencil}'
  button-ghost:
    textColor: '{colors.graphite-muted}'
    rounded: '{rounded.sm}'
    size: '40px'
  button-ghost-hover:
    backgroundColor: '{colors.blue-wash}'
    textColor: '{colors.graphite}'
  button-pencil:
    textColor: '{colors.blue-pencil}'
    typography: '{typography.margin-note}'
    padding: '0'
  button-sm:
    rounded: '{rounded.sm}'
    padding: '0 12px'
    height: '32px'
  input-field:
    backgroundColor: '{colors.paper-raised}'
    textColor: '{colors.graphite}'
    typography: '{typography.body}'
    rounded: '{rounded.sm}'
    padding: '0 12px'
    height: '44px'
  step-sheet:
    backgroundColor: '{colors.paper-raised}'
    textColor: '{colors.graphite}'
    rounded: '{rounded.md}'
    padding: '16px 20px'
  step-sheet-pending:
    textColor: '{colors.graphite-muted}'
    rounded: '{rounded.md}'
    padding: '12px 20px'
  step-row-compact:
    backgroundColor: '{colors.paper-raised}'
    textColor: '{colors.graphite}'
    rounded: '{rounded.md}'
    padding: '8px 12px'
    height: '48px'
  step-number:
    textColor: '{colors.graphite-muted}'
    typography: '{typography.data}'
  step-number-running:
    textColor: '{colors.blue-pencil}'
    typography: '{typography.data}'
  answer-sheet:
    backgroundColor: '{colors.paper-raised}'
    textColor: '{colors.graphite}'
    typography: '{typography.answer}'
    rounded: '{rounded.md}'
    padding: '20px 24px'
  margin-note:
    textColor: '{colors.blue-pencil}'
    typography: '{typography.margin-note}'
    width: '272px'
  status-mark:
    typography: '{typography.label}'
  notice-note:
    backgroundColor: '{colors.paper-raised}'
    textColor: '{colors.graphite}'
    typography: '{typography.small}'
    rounded: '{rounded.sm}'
    padding: '12px 16px'
  notice-warning:
    backgroundColor: '{colors.paper-raised}'
    textColor: '{colors.graphite}'
    typography: '{typography.small}'
    rounded: '{rounded.sm}'
    padding: '12px 16px'
  notice-error:
    backgroundColor: '{colors.paper-raised}'
    textColor: '{colors.graphite}'
    typography: '{typography.small}'
    rounded: '{rounded.sm}'
    padding: '12px 16px'
  code-excerpt:
    textColor: '{colors.graphite}'
    typography: '{typography.code}'
    padding: '8px 0'
---

# Design System: highnet-rag

## Overview

**Creative North Star: "The Engineer's Computation Pad"**

Each query is worked out like a calculation on pale-green engineering paper. The question is written at the top of the sheet, every pipeline stage is one numbered step below it, and the answer is the last line, marked with an `=` in the number margin. Graphite ink carries every fact and number. Blue pencil, the draughtsman's non-photo blue, is the one voice of annotation and action: "Why this step?" notes, the running step, links, focus and the Run button. Red means a failure and nothing else.

The mood is calm and exact. The page is plain pale-green paper with no ruled pattern (the owner removed the original 20px grid); structure comes from the sheets, the step track and the dashed rules alone. There are no gradients, glass, glows or illustrations; the trace data is the imagery. The dark theme is the same pad under a drafting lamp: a green-black ground, pale graphite and a brighter blue pencil. It is a change of lighting, not a different world.

Motion is sparse and has one job: steps are written into the pad as their trace events arrive. A streaming answer shows a blinking blue-pencil caret. Under `prefers-reduced-motion`, every animation and transition collapses to an instant change.

**Key Characteristics:**

- One family, Recursive, in three voices set by its axes: prose, pencil and data.
- A single accent, blue pencil; a separate data palette reserved for retrieval series.
- Flat paper: 1px rules, 2px and 4px corners, no shadows anywhere.
- Solid rules for edges, dashed rules for the working inside a sheet and for steps not yet written.
- Step numbers hang in a margin; the running step is marked there, not on the sheet.
- Every state is an SVG mark plus a word, never colour alone.

## Colors

Neutral paper and graphite with one pencil accent, three semantic inks and a data palette kept for charts and ranked series. Each role is a CSS custom property on `:root`; the `.dark` class overrides the same property with its lamp value, recorded here with a `lamp-` prefix. Tailwind and shadcn names (`primary`, `card`, `border`, `input`, `ring`, `chart-1..5`) alias these roles and never carry their own values.

### Primary

- **Blue Pencil** (`blue-pencil` / `lamp-blue-pencil`): margin notes, the running step's number and mark, the primary button, pencil-style text actions, links and citation numbers, focus outlines and the input caret. It is also the only colour a code excerpt uses besides graphite.
- **Blue Wash** (`blue-wash` / `lamp-blue-wash`): the ground under a current selection: text selection, a targeted passage, the pressed quiet button and hover on quiet and ghost buttons.

### Neutral

- **Paper** (`paper`): the page ground, plain. Also the text colour on the primary button.
- **Raised Paper** (`paper-raised`): a sheet laid on the pad: step sheets, the answer sheet, notices, inputs and quiet buttons.
- **Grid Green** (`grid`): quiet fills (`muted`) and the disabled primary button fill. The name is historical; no grid is drawn.
- **Sheet Rule** (`rule`): every sheet edge, divider and table rule, solid or dashed; also the scrollbar thumb. Decorative, so below 3:1 on purpose.
- **Input Rule** (`rule-input`): the border of interactive controls (input and quiet button), at least 3:1 for WCAG 1.4.11.
- **Graphite** (`graphite`): body text, headings and values.
- **Muted Graphite** (`graphite-muted`): secondary text, units, timestamps, readouts, step numbers at rest and pending step titles.

### Semantic

- **Red Check** (`red-check`): a step failed, an error notice, an invalid input, the budget stopped.
- **Amber Note** (`amber-note`): warnings, such as a degraded budget, a lost stream connection or low scores.
- **Green Tick** (`green-tick`): a step or check passed.

### Data

One colour per retrieval series, for rank columns, chart series and badges: **BM25 Umber** (`data-bm25`), **Vector Blue** (`data-vector`), **Fused Violet** (`data-fused`), **Rerank Green** (`data-rerank`) and **Everything Else** (`data-neutral`). Each series also has a marker shape: a square for BM25, a circle for vector, a diamond for fused (rerank will take a triangle). A rank badge is the coloured marker followed by the rank in graphite, with a screen-reader label naming the series, so colour is never the only cue. The fusion step shows the BM25 and vector rankings side by side from `lg` (stacked below), then the fused list with each passage's rank in both inputs, its RRF score over the two contributions, and a blue-pencil rule, always drawn, where the top-k cut falls. Candidates below the cut fold behind a pencil toggle under that rule; when opened, their rows and rank badges are muted (the marker shapes stay).

### Named Rules

**The One Pencil Rule.** Blue pencil is the only accent. When something needs emphasis, use weight, scale, position or Recursive's casual axis before adding a colour. Code excerpts follow the same rule: keywords, built-ins and literals are blue pencil at 600, titles are graphite at 600, strings and numbers switch to the casual mono voice, comments are muted graphite in the pencil slant. The data palette is reserved for retrieval series and never tints code.

**The Red Means Wrong Rule.** Red appears only for failure. Never use it for brand, highlights or "important".

**The Lamp Rule.** The dark theme changes values, never roles. Every new colour is added to both `:root` and `.dark` under the same name.

## Typography

**Display Font:** Recursive (with ui-sans-serif, system-ui)
**Body Font:** Recursive (with ui-sans-serif, system-ui)
**Label/Mono Font:** Recursive with MONO 1 (with ui-monospace, SFMono-Regular)

**Character:** One variable family used through its axes, so the pad reads as one person's hand and one instrument's readout. The linear sans (MONO 0, CASL 0, slnt 0) is the prose voice; the pencil voice (CASL 0.5, slnt -7) is the hand-lettered annotation; the data voice (MONO 1) with tabular, slashed-zero figures is for everything measured.

### Hierarchy

- **Sheet title** (650, clamp 1.5rem to 2.25rem, 1.1, -0.01em, balanced): the question at the top of the sheet, preceded by "Sheet 1 ·" in the muted data voice.
- **Step heading** (600, 1.125rem, 1.375): a step's title. Pending and skipped steps drop to 500 at 1rem in muted graphite; the compact phone row uses 1rem.
- **Answer** (400, 1.125rem, 1.625, max 68ch): the result line in the answer sheet.
- **Body** (400, 1rem, 1.625, max 68ch, pretty wrapping): explanations and passages.
- **Small** (400, 0.875rem, 1.5): notices, settings, supporting text.
- **Margin note** (450, 0.9375rem, 1.5, pencil voice, blue pencil): the "Why this step?" note.
- **Data** (400, 0.875rem, 1.5, data voice): scores, distances, IDs, settings values, the site name.
- **Label** (500, 0.75rem, 1.25, +0.04em, data voice, sentence case): section headings such as "The working", status words and table column heads.
- **Code** (400, 0.75rem, 1.625, data voice): Python excerpts under each step.

### Named Rules

**The Numbers Are Mono Rule.** Anything measured (rank, score, distance, ms, tokens, $) is set in the data voice with tabular figures, so columns line up like a worked calculation.

**The Three Voices Rule.** Voice is set by Recursive's axes, never by another family. Prose is linear, annotation is pencil, measurement is mono. Labels stay sentence case; never all caps.

## Layout

The page is one centred column capped at 72rem, with 16px side padding on phones and 32px from `md`. The body is flat paper. Spacing follows Tailwind's 4px steps: sheets are padded 16px by 20px, steps are 8px apart on phones and 16px from `md`, and the question block and the working are 32px apart (40px from `md`).

Every step and the answer share one three-track grid, so numbers, sheets and notes line up down the page:

- **Phones, below 768px:** a 2rem number track and the sheet, 12px apart. Each step is a one-line collapsible row. The settings strip folds into a one-line summary below `sm` (640px); the Run and Stop buttons shrink to 44px squares showing only their icon.
- **From `md`, 768px:** a 3rem number track and a 16px gap. A 1px vertical margin rule in `rule` runs the full height of the step list through the gutter between the numbers and the sheets (56px from the list's left edge). Steps render as open sheets.
- **From `lg`, 1024px:** a third track, 17rem wide, holds each step's blue-pencil margin note beside its sheet, with 32px gaps. Below `lg` the note folds into the sheet as an inline "Why this step?" disclosure, open by default on phones.

Motion belongs to the step. When a trace event arrives, the step is written in top to bottom with the write-in motion (a 4px rise and a top-down clip reveal on `cubic-bezier(0.16, 1, 0.3, 1)`), staged so the whole step lands in about 180ms: the number over 120ms, then the sheet over 140ms from 40ms, then the margin note over 90ms from 90ms. The answer sheet uses the same motion at 180ms. Pending and skipped steps do not animate.

## Elevation & Depth

The pad is flat and has no shadows. A sheet sits on the paper through a 1px rule and a raised-paper fill; a pending step is only a dashed outline on the bare paper. The answer sheet is set apart by a stronger outline, 1px graphite at 70%, not by lifting it. There are no overlays in this build.

### Named Rules

**The Flat Pad Rule.** No `box-shadow`, blur or glow on anything. Depth is paper fill and a 1px line.

## Shapes

Paper corners: 2px on controls and notices, 4px on sheets, and none on the pad, tables and passage lists. Nothing is pill-shaped or circular except SVG status marks. Every line is 1px: solid for a sheet's edge and for the section rules under headings and above the footer; dashed for the working inside a sheet (dividers between details, the settings strip, rank-table rows, passage lists, code captions) and for the outline of a step that has not been written yet. Focus is a 2px blue-pencil outline, offset 2px (0px on inputs, where the border also turns blue pencil).

The running step is marked in the number margin, not on the sheet: its number turns blue pencil and a 2px blue-pencil rule hangs from the number down the full height of the step.

### Named Rules

**The Dashed Is Inside Rule.** A solid rule bounds a thing; a dashed rule divides the working inside it or outlines something still to come.

**The Margin Carries the Mark Rule.** Step state that needs a line lives in the number margin. Never add a thick coloured stripe to a sheet's edge.

## Components

### Buttons

Plain paper controls: 14px medium sans, 2px corners, 8px icon gap, 16px SVG icons.

- **Shape:** squared paper corners (2px); default height 40px with 16px padding, small 32px with 12px padding at 13px, icon 40px square, inline with no box.
- **Primary:** blue-pencil fill with paper text, for Run. Hover mixes 18% graphite into the fill; pressed nudges down 1px; disabled is a grid-green fill with muted text.
- **Quiet:** raised paper with a 1px input rule and graphite text, for Stop and the top-k steppers. Hover lays a blue wash; pressed (`aria-pressed`) adds a blue-pencil border and text on the wash.
- **Ghost:** muted text on nothing; hover lays a blue wash and darkens the text. Used for the theme toggle.
- **Pencil:** a text action in the pencil voice and blue pencil with a dotted underline that turns solid on hover. Used for suggested questions, retry, and "show code", "show passage" and "under the hood" disclosures.
- **Focus:** 2px blue-pencil outline, offset 2px, on every variant.

### Inputs / Fields

- **Style:** 44px tall, raised paper, 1px input rule, 2px corners, 12px inline padding, 16px text, muted placeholder, blue-pencil caret.
- **Hover / Focus:** hover darkens the border to graphite at 60%; focus turns the border blue pencil and adds a 2px blue-pencil outline with no offset.
- **Error / Disabled:** invalid turns the border red check; disabled drops the fill to transparent.

### Typography

A single `Typography` primitive carries the ramp as variants (`sheetTitle`, `stepHeading`, `body`, `small`, `marginNote`, `data`, `label`) with default elements (h1, h3, p, p, p, span, span) and colour variants `default`, `muted`, `pencil`, `destructive`, `warning` and `success`. New text uses a variant before any one-off class.

### Step Sheet (signature)

A numbered step of the calculation: the two-digit number in the data voice in the margin track, the working on a raised-paper sheet (1px rule, 4px corners, 16px by 20px padding) and the pencil note beside it from `lg`. The header puts the step heading on the left and the readout (ms, tokens, $ in muted data) and status mark on the right. Details below a dashed rule hold the stage body, the inline "Why this step?" (below `lg`) and the code excerpt. Pending and skipped steps are dashed outlines with no fill and muted titles; a failed step's border turns red check.

Below 768px each step is a one-line collapsible row at least 48px tall: the title, a two-line muted data summary of the result, the status mark and a blue-pencil chevron that turns 180° when open.

### Status Mark

A 14px SVG mark (lucide stroke, 2.25 weight) plus a word in the label size and data voice: pending (open circle, muted), running (spinning loader, blue pencil), ok (check, green tick), skipped (minus, muted), warning (triangle, amber note), error (cross, red check).

### Notice

A raised-paper strip with 2px corners, a 1px toned border, 12px by 16px padding, small text in graphite and a 16px toned SVG icon. Three tones: **note** (blue pencil border at 60%, flask icon) for starting and illustrative-data states; **warning** (amber note border, triangle) for a degraded budget or a dropped stream; **error** (red check border, circle alert, `role="alert"`) for an offline API or a stopped budget.

### Answer Sheet

The result line: an `=` in blue pencil in the number margin, then a raised-paper sheet with a graphite outline at 70%, a muted label heading, the answer at 1.125rem with superscript blue-pencil citation numbers, a dashed rule, the sources list and a totals line in muted data.

### Step Figures

Each step carries one small figure, drawn from that run's trace and placed above the step's tables. Figures are HTML and CSS, not charts: a Bar is a 1px-ruled track in quiet green with filled segments laid end to end and optional 1px graphite tick marks for thresholds. Colour keeps its meaning. The three retrieval series use their data colours (BM25 umber for term weights, vector blue for distances and embedding values, both for fusion contributions); everything else is blue pencil (the part that matters: used requests, passages, input), graphite (the question, output cost), soft graphite (reserved room, uncited passages) or the tier colours on the budget meter. Every figure has a one-line caption in small muted prose that says how to read it, and a text alternative with the same numbers; the citation grid is a real table instead. Nothing animates. On phones a figure folds away with its step.

### Code Excerpt

Opened by a pencil action with a code icon. Each excerpt has a caption over a dashed rule (title in small sans, `file:start–end` link in muted data) and a scrolling block at 0.75rem in the data voice, coloured by the One Pencil Rule.

## Do's and Don'ts

### Do:

- **Do** let real trace data be the only imagery: scores, distances, prompts, passages.
- **Do** keep every measured value in the data voice with its unit, taken from the actual trace.
- **Do** show states with an SVG mark and a word as well as colour, in both themes.
- **Do** put new colours in both `:root` and `.dark` under one name, and reach them through the shadcn aliases.
- **Do** write a new step in with the staged write-in motion and let reduced motion make it instant.
- **Don't** bring back a background pattern (grid, dots, lines); the owner rejected it. The paper stays plain.

### Don't:

- **Don't** ship default shadcn styling. Every primitive is restyled to these tokens.
- **Don't** add shadows, gradients, glassmorphism, glows or neon.
- **Don't** use decorative illustrations, or icons that stand in for data.
- **Don't** add a thick coloured stripe to a sheet's edge; step state goes in the number margin.
- **Don't** colour code or UI chrome from the data palette, or add a second accent colour for emphasis.
- **Don't** use red for anything except failure.
- **Don't** turn the paper metaphor into a costume: no torn edges, coffee stains, spiral bindings or a second, handwriting family.
- **Don't** set labels in all caps or put a small label above a heading as decoration.

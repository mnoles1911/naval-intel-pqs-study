# Design brief — Wedding Placement & Seating Planner

Hand this document to **Claude (for design)** — e.g. a new Claude conversation or a Claude Artifact session — to generate refreshed frontend styling, UI/UX, graphics, and assets. The last section explains exactly how to fold the results back into this codebase.

---

## 1. What the app is

A private, password-protected web app one couple uses to plan **where physical
things and people go at their wedding** — decor & stationery items *and* the
guest seating chart. It is warm, personal, and celebratory, not corporate. The
current look is an intentional first pass ("functional, then beautiful"); this
brief is the "beautiful" pass.

**Audience:** two non-technical people (the couple), often on a phone, sometimes
sharing a laptop. **Tone:** elegant, editorial, wedding-stationery — think fine
paper, letterpress, muted botanicals — but still crisp and usable.

## 2. The screens (what exists today)

| Route | Purpose |
| --- | --- |
| `/login` | Single shared-password gate. Centered card. |
| `/` (Dashboard) | Overview: items grouped by table, summary tiles (total / purchased / needed / unassigned), a "purchased" progress meter, search + status/category filters. |
| `/items` | Items hub: full list with search/filters, inline status toggle & table assignment, edit/delete, **multi-select bulk actions**, **quantity roll-ups**, and **CSV import**. |
| `/items/new` | Create items: single or **bulk** (many names), with a **placement** control to duplicate an item across one / several / every table. |
| `/items/[id]` | Edit one item (incl. a **multi-photo** gallery). |
| `/locations` | Tables: create/edit/delete, accent color, **shape (round/rectangular)**, **seat count**, and assigning items to a table. |
| `/plan` | Floor plan with two views: **Board** (items in table "zones", drag to assign) and **Map** (a venue canvas with draggable, resizable table markers showing seats; click a table to drill into who sits there + its items; drag items onto the map). |
| `/seating` | Seating chart: tables drawn in their shape with seats, drag guests to seats (with occupant swap), **linked parties** that must sit together (split parties flash a red warning), **multiple saved seating plans** (version control), a venue map, and CSV import/export. |
| `/setup` | Printable day-of setup checklist per table, plus CSV export. |

App shell: a sticky top header with a wordmark and tab nav
(Dashboard · Items · Locations · Floor plan · Seating · Setup sheets) + a
sign-out control, and a thin footer.

## 3. The current design system (your starting point)

All styling lives in **`src/app/globals.css`** as CSS variables + Tailwind v4
`@theme` tokens + a small `@layer components` set of reusable classes. Screens
consume these tokens/classes; they rarely hard-code colors. **Keeping the same
token names and class names means a restyle is mostly a `globals.css` swap with
little-to-no component churn** — please design around that.

**Palette (light):** warm ivory background `#f6f2ea`, ink text `#2a2622`, soft
taupe muted text, antique-gold accent `#a9834e`, plus rose `#b98a8a`,
sage `#8a9a7b`, ink-blue `#5f7488`; status colors amber (needed), slate-blue
(purchased), garden-green, and a danger red. A full dark theme mirrors every
token via `prefers-color-scheme` and a `data-theme` override.

**Type:** Cormorant Garamond (serif display, `.font-display`) + Inter (UI sans),
self-hosted through `next/font` in `src/app/layout.tsx`.

**Component classes** (defined once, used everywhere — restyle these and the
whole app changes): `.btn` (+ `.btn-primary` / `.btn-ghost` / `.btn-danger`,
`.btn-sm`), `.card` (+ `.card-hover`), `.input`, `.label`, `.chip`, `.dot`,
`.meter` (progress bar), `.font-display`, `.eyebrow` (uppercase mini-label).

## 4. What we want you (Claude design) to produce

Aim for a cohesive, elegant wedding aesthetic that still reads as a functional
planning tool. Deliverables, in rough priority order:

1. **Refined visual language** — a considered type scale, color palette (light
   **and** dark), spacing rhythm, corner radii, and elevation/shadow system.
   Provide these as concrete values mapped to the token names in §3 (or propose
   renamed tokens + the mapping).
2. **Restyled core components** — buttons, cards, inputs/selects/textareas,
   chips/badges, tabs & top-nav, tables/list rows, progress meters, modals/side
   panels, and a toast/inline-alert style. Deliver as an updated
   `@layer components` block (same class names where possible).
3. **Iconography** — a small, consistent SVG icon set for the nav and common
   actions (add, edit, delete, drag handle, search, import/export, print,
   status dots). Line style, ~1.5px stroke, currentColor.
4. **Illustrations & graphics** — tasteful, on-brand SVG art for: empty states
   (no items / no guests / nothing placed), the login screen hero, and light
   decorative botanical motifs/dividers. Optional: per-category item glyphs
   (florals, lighting, stationery, tableware, …).
5. **Brand assets** — a simple wordmark/logo, a favicon (emoji or SVG), and an
   Open Graph share image.
6. **Data-viz & spatial styling** — the look of progress meters, the round/rect
   **table markers with seat squares** on the venue map, seat "occupied" states,
   and the party-color legend/warning treatment.
7. **Print styling** for the setup sheets (clean black-on-white, page breaks).

## 5. Hard constraints (please design within these)

- **Tailwind CSS v4** with tokens in `@theme` and components in
  `@layer components` inside `src/app/globals.css`. No other CSS framework.
- **Light *and* dark** must both look intentional. We drive dark via
  `@media (prefers-color-scheme: dark)` **and** a `:root[data-theme="dark"]`
  override — provide both.
- **Accessible:** WCAG AA contrast, visible focus states, respect
  `prefers-reduced-motion`, real labels/aria. Don't rely on color alone
  (e.g. keep the ⚠ icon on split-party seats, not just red).
- **Self-contained at runtime:** no external CDNs, trackers, or remote fonts at
  request time. Fonts via `next/font` (Google font *names* are fine — they're
  self-hosted at build). Images/illustrations as **inline SVG or files in
  `public/`**, or data-URIs. Photos use `next/image` with `unoptimized`.
- **Responsive, mobile-first** — the couple mostly uses phones. Wide things
  (tables, the venue map) must scroll inside their own container, never the page.
- **No new npm dependencies** without calling it out explicitly.

## 6. Preferred handoff format (what to send back)

Please return:

1. **`globals.css` content** — either a full drop-in replacement or two clearly
   separated snippets: (a) the `:root` + dark-theme variables + `@theme inline`
   block, and (b) the `@layer components` block. Keep the existing class names
   (`.btn`, `.card`, `.input`, `.chip`, `.meter`, `.font-display`, `.eyebrow`,
   …) so integration is a paste, not a refactor. If you rename or add tokens,
   include a short mapping table.
2. **Font choice** — the exact `next/font` import(s) (family, weights, subsets)
   and the `--font-*` variable names, so we can update `src/app/layout.tsx`.
3. **Assets as files** — SVGs for icons, illustrations, logo, favicon, and OG
   image, named and grouped (e.g. `icons/`, `illustrations/`, `brand/`). Inline
   SVG snippets are also fine for one-off decorations.
4. **A short "where it goes" note** — for anything beyond `globals.css`, tell us
   which screen/component it belongs to (use the routes in §2). Screen files are
   listed in §7.
5. If you build it as a **Claude Artifact**, make it a self-contained HTML/CSS
   style guide (tokens, components, icons, illustrations shown together) — that's
   the easiest thing for us to translate back.

## 7. How we incorporate your output (integration steps)

Because styling is centralized, most of your work lands in **one file**. Concrete
steps on our side:

1. **Tokens & components → `src/app/globals.css`.** Replace the `:root` /
   dark-theme variable blocks, the `@theme inline` mappings, and the
   `@layer components` block with yours. Same class names ⇒ every screen updates
   at once with no component edits.
2. **Fonts → `src/app/layout.tsx`.** Swap the `next/font` imports and the
   `--font-*` variables to match your type choice.
3. **Assets → `public/`.** Drop SVGs/images into `public/` (e.g.
   `public/illustrations/empty-items.svg`) and reference them with
   `<img src="/illustrations/empty-items.svg">` or `next/image`. For an icon set
   we prefer small inline-SVG React components under `src/components/icons/`.
4. **Favicon / OG → `src/app/`.** Favicon at `src/app/icon.svg` (or `favicon.ico`)
   and OG image via `src/app/opengraph-image.*` — Next.js picks these up by
   convention.
5. **Screen-specific polish (only if class names change):** the screens live at
   the routes in §2; their components are under `src/components/` (e.g.
   `Dashboard.tsx`, `ItemCard.tsx`, `ItemForm.tsx`, `StatusBadge.tsx`,
   `PhotoUpload.tsx`, `components/items/*`, `components/plan/*`,
   `components/seating/*`, `components/setup/*`). If you keep the shared classes,
   you can ignore these.
6. **Verify:** we run `npm run build` and `npm run lint` (both must stay green),
   then click through the Vercel preview deploy that every pull request gets, in
   light and dark, on a phone width. Then iterate.

### The single highest-leverage ask
If you do nothing else: deliver a beautiful, accessible **`globals.css`**
(tokens + the `@layer components` classes, light + dark) plus a font pairing and
a set of empty-state / login illustrations. That alone restyles the entire app.

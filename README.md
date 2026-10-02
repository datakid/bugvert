# bugvert 2 — smart unit & price converter

A browser app that takes a messy pharmacy or inventory sheet (xlsx, xls, ods, csv, tsv, or rows pasted from Excel). It works out which column is the name, unit, price and quantity, picks the direction (pack → single or single → pack), rescales price and quantity, and handles duplicates. Every row can be changed by hand. Nothing leaves the browser.

## Architecture
Data flows one way, and all output is recalculated from scratch:

```
source rows (never changed) + doc (your edits as overrides) + settings + pack memory
        └──────────── Engine.compute() ────────────┘
                         │
          one result → sheet, units, duplicates, export
```
- `js/engine.js`: pure logic with no DOM. Parsing, column detection, direction detection, compute, filtering and sorting, export values.
- `js/state.js`: the store. Holds the `doc` (roles, direction, unit rules, row overrides, duplicate decisions, columns), undo/redo snapshots, settings and pack memory in localStorage, and session autosave.
- `js/ui.js`: the shared UI kit. Icons, stacking popovers, menus, custom selects, segmented controls, switches, steppers, confirm modal, toasts.
- `js/app.js`: the shell (header, dock, tabs), import, and the Source view.
- `js/sheet.js`: the virtual-scrolling sheet grid.
- `js/views.js`: the Units, Duplicates, Columns, Export and Settings views.

Export calls `Store.fresh()`, which saves any edit still in progress and then recalculates. The v1 bug where you had to download several times to get current data can't happen anymore.

## Features
- **Smart detection**
  - Header row found automatically. A file with no header row gets generic column names.
  - Columns are scored on their content: unit-pattern ratio, numeric ratio, decimals, uniqueness and text length.
  - Price, quantity and value are found by testing which column triplet satisfies `a × b = value`.
  - Junk columns are ignored: almost empty, a single constant value, row numbers, or copies of another column.
  - Code and category columns are recognised.
  - Confidence badges show how sure each guess is.
- **Direction:** found automatically from packs vs singles and switchable from the header.
- **Units:** 15 families, measure words (ml, mg) recognised and never converted, plus a user dictionary for unknown words.
- **Pack size, three levels:** per row (popover, bulk action, keyboard), per unit (Units tab), and default (Settings). Pack memory learns `item → pack size` from pack files and reuses it for single → pack.
- **Pack size from item names:** in single → pack, names like `Panadol 24s`, `Brufen x 30`, `Cipro 20 tabs`, `2x10`, `Box of 30`, `24 قرص` set the pack (priority: row → memory → name → unit default → default). Toggle in Settings. Rules:
  - Only used when the row's unit is a single (`1 T`, `Tab`) of a countable family. A unit with a count (`10 T`) always wins, and bottles, tubes and other non-countables never read names.
  - Strengths are removed before matching: a number touching or followed by mg, mcg, g, ml, IU, units, %, mmol, مجم, مل… (`500mg`, `500 mg`, `100u/ml`, `120mg/5ml`, `875/125mg`, `500+125mg`), ratios like `875/125`, and decimals.
  - A plain number with no pack marker (`Amox 500`, `Cetirizine 10`) is never a pack size.
  - If the name gives two different pack sizes (`24s 12s`), nothing is used.
- **Duplicates**
  - Smart mode merges automatically when prices are within the tolerance and flags the rest for review.
  - Per group: merge or keep separate, include or exclude members, and choose the price rule.
  - Per row: take it out of a merge, or leave it out of duplicate matching.
  - Manual merge of any selected rows.
  - Optional near-duplicate matching (Settings): ignores word order and mg/tab noise and allows small typos inside the same strength and unit. Fuzzy groups are always kept separate and flagged for review until you decide.
- **Sheet**
  - Quick views: all, needs a look (with issue sub-chips), converted, unchanged, edited, duplicates, excluded.
  - Search.
  - Per-column popover: sort, conditions (empty, = 0, >, contains…), value checklist.
  - Inline editing (Enter or typing), keyboard navigation, Delete to reset.
  - Row inspector, row menu, shift-click range select, floating bulk bar.
- **Columns:** presets (Clean / Side by side / Everything / My default), toggle, rename, drag reorder, and a new-name template (`{name} {unit}`).
- **Settings:** rounding decimals and mode (nearest/up/down) for price and quantity separately, unit label style, duplicate defaults, auto-exclude empty rows.
- **Theme:** System (default, follows the OS live), Light, Dark. Header button or Settings → Appearance. Applied before first paint so nothing flashes.
- **Multi-sheet merge:** for workbooks with several sheets, pick "All sheets merged" in Source. Rows are stacked, columns matched by header, and a `Sheet` column records the origin.
- **Export:** xlsx or csv of exactly the visible columns, for the current view or all rows. Numbers are real numbers and empty cells are truly empty.
- **History and saving:** undo/redo for every edit (Ctrl+Z / Ctrl+Shift+Z), session autosave and resume.

## Entry
- `index.html` (no parameters). Add a file by dropping it anywhere, pasting anywhere on the start screen, or using the drop zone.

## Storage
localStorage only: `bugvert2.settings` (includes `theme`, `useName`, `dupFuzzy`), `bugvert2.memory`, `bugvert2.session`. No server, no tables.

## Not yet implemented
- Choosing which sheets to merge (currently all non-empty sheets)
- Column mapping between sheets with different header names

## Next steps
- Sheet picker checklist for merging
- Header synonym mapping across sheets

## Files
`index.html`, `css/style.css`, `js/{engine,ui,state,app,sheet,views}.js`, `js/xlsx.full.min.js`, `images/bugvert.jpg`.

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
- **Duplicates**
  - Smart mode merges automatically when prices are within the tolerance and flags the rest for review.
  - Per group: merge or keep separate, include or exclude members, and choose the price rule.
  - Per row: take it out of a merge, or leave it out of duplicate matching.
  - Manual merge of any selected rows.
- **Sheet**
  - Quick views: all, needs a look (with issue sub-chips), converted, unchanged, edited, duplicates, excluded.
  - Search.
  - Per-column popover: sort, conditions (empty, = 0, >, contains…), value checklist.
  - Inline editing (Enter or typing), keyboard navigation, Delete to reset.
  - Row inspector, row menu, shift-click range select, floating bulk bar.
- **Columns:** presets (Clean / Side by side / Everything / My default), toggle, rename, drag reorder, and a new-name template (`{name} {unit}`).
- **Settings:** rounding decimals and mode (nearest/up/down) for price and quantity separately, unit label style, duplicate defaults, auto-exclude empty rows.
- **Export:** xlsx or csv of exactly the visible columns, for the current view or all rows. Numbers are real numbers and empty cells are truly empty.
- **History and saving:** undo/redo for every edit (Ctrl+Z / Ctrl+Shift+Z), session autosave and resume.

## Entry
- `index.html` (no parameters). Add a file by dropping it anywhere, pasting anywhere on the start screen, or using the drop zone.

## Storage
localStorage only: `bugvert2.settings`, `bugvert2.memory`, `bugvert2.session`. No server, no tables.

## Not yet implemented
- Pack size read from item names (e.g. "Panadol 24s")
- Fuzzy or near-duplicate name matching
- Multi-sheet merge in a single session

## Files
`index.html`, `css/style.css`, `js/{engine,ui,state,app,sheet,views}.js`, `js/xlsx.full.min.js`, `images/bugvert.jpg`.

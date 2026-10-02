# bugvert 2.5 — smart unit & price converter

A browser app that takes a messy pharmacy or inventory sheet (xlsx, xls, ods, csv, tsv, or rows pasted from Excel). It finds the name, unit, price and quantity columns, reads every row's unit and pack size, picks the direction (pack → single or single → pack), rescales price and quantity, and handles duplicates. Every decision is explained and exported. Nothing leaves the browser.

## What's new in 2.5
- **Unified unit resolver.** For each row the unit column and the item name are read together, so units can live in their own column (the default), inside the name, or be split across both.
- **Name reader with confidence.** Strengths (`500mg`, `875/125`, `100u/ml`, `2%`, decimals, `مجم`) are removed first. Each pack pattern then gives a candidate tagged sure, likely or guess. Patterns: count + form word (`24 tabs`), `24s`/`30's`, multiplier (`x 30`), blister math (`2x7`, `3 strips of 10`), container (`box of 30`, `30/pack`), Arabic counts (`24 قرص`, `٢٠ أقراص`), brackets (`(20)`), trailing number (`500mg 24`). Protected words (`Omega 3`, `Vitamin B 12`) stop a name number being read as a pack size.
- **Both directions.** Pack → single: an empty or size-less unit (`Box`) gets its size from the name, and a box with no size is flagged instead of guessed. Single → pack: the name size is used when the unit is a single. Direction detection counts units resolved with help from names, and runs again when detection settings or column roles change (until you pick a direction yourself).
- **Guardrails.** A name/unit conflict (`Zyrtec 20s` with `10 T`) keeps the unit and is flagged. Two different sizes in one name are skipped by default. Counts outside the valid range (2–1000) are ignored.
- **Detection settings panel** (Settings → Detection): unit source (Auto / Unit column / Name), sizes in names (Off / Fill gaps / Prefer name), certainty (Strict / Balanced / Loose), how to handle several sizes, valid range, conflict flag, single → pack priority order (memory / name / unit default, then the default pack), each pattern on or off with how many rows in this file used it, protected words, extra strength units, a one-click return to recommended defaults, and a live **Try it** bench that shows each step for any name and unit.
- **Source → Detection card:** a confidence meter (sure / likely / guess) and clickable counts (read from names, remembered, default used, conflicts, sizeless boxes, multi-size names) that open the matching rows in the Sheet. There is also a quick switch for sizes in names.
- **Sheet:** a confidence dot on likely or guessed units, a highlight on units that came from names, new issue chips, and filters by rule or confidence. The inspector shows how the unit was read, the name clue, a plain-language explanation, and a one-click "use the name's size" fix for conflicts.
- **Transparent export:** the Export preview has three tabs, **Data**, **Logic** and **How it works**. Excel downloads include a `Logic` sheet (one row per source row: what was read, where from, the name clue, confidence, rule, factor, the price and quantity calculation with rounding, the duplicate outcome, flags and a written explanation) and a `How it works` sheet (columns used, direction and why, every detection setting, result counts, rounding, duplicate rules, unit decisions, formulas, pattern reference). There is a toggle to leave them out, and a "Download the logic on its own" link (this also works for CSV).
- Two samples: a packs sheet and a singles sheet with sizes inside the names.
- Performance: parse results and name reads are cached, column detection samples large files, and per-family rules are cached. In tests, 40k rows load in about 2 s and recompute in about 0.5 s.
- Fixed light-theme colour variables that referred to themselves (hover, selection, glass, knobs, row lines).

## 2.5 polish pass
- **No more re-render flicker.** A small keyed DOM morph (`UI.morph`) updates views in place instead of replacing `innerHTML`. Focus, caret, scroll position, open menus and in-progress typing are kept when data or settings change. Segmented controls, steppers and selects update in place. Sheet rows are keyed by row id, so scrolling and edits only patch changed cells.
- **Reload without a flash.** The theme and a `booting` class are set before first paint, so transitions are off until the first frame. The saved session is restored on boot (file, edits and the current Sheet filters), and so is the last tab for the current browser tab (sessionStorage). Session saves flush on `pagehide` and when the tab is hidden, so nothing is lost on a fast refresh.
- **Snappier motion.** Most transitions now take 140–200 ms. Shorter view-enter animation, faster dock glider, popovers fade and scale with no spring overshoot, faster switches and toasts, and `prefers-reduced-motion` is respected. Theme switching turns transitions off for one frame so colours change cleanly.
- **Readable badges and tags.** New contrast tokens (`--count-bg/ink`, `--badge-bg/ink`, `*-ink` per hue) for segmented counts (e.g. "Duplicates 22"), quick-filter counts, dock badges, role tags, confidence labels, rule chips, unit pills and detection chips, in both light and dark themes. Muted text was darkened in light mode and lightened in dark mode.
- **Settings redesign.** A sticky section nav (a left rail on desktop, scrollable pills on mobile) with scroll-spy. There are nine numbered cards, each with an icon, a title and a one-line purpose: Detection, Name patterns, Conversion, Rounding, Unit labels, Duplicates, Rows & columns, Dictionary, Appearance. Long cards have labelled subsections. Links from other tabs ("Change", "Tune") jump to and highlight the right card.
- **Bug fixes.** Undo now works after column preset changes. Reorder arrows skip hidden or stale columns and are disabled at the ends. Bulk "Keep separate", merge and exclude no longer render twice. Removing chips from tag or dictionary lists always uses current settings. The Export file name is kept while typing during re-renders. Export counts no longer recompute three times. You are asked to confirm before replacing a file that has edits (drop, browse or sample). Drag-sort handles `pointercancel`. Stepper buttons are disabled at their limits. Modal Tab/Enter/Escape handling is fixed and modals can't close twice. Column widths reset when a new file opens. Active-cell lookup is correct inside expanded merged groups. The inline editor commits when its row scrolls out of the virtual window.

## Ship polish
- **Automatic rounding.** Price and quantity decimals now default to **Auto**. bugvert reads the most decimals the file already uses (price at least 2, quantity at least 0). It then adds only as many as the converted values need, up to 6 for price and 4 for quantity, and ignores the top 2% of outliers. Examples: 17.115 ÷ 10 → 1.7115, and 3.15 × 10 → 31.5 at 2 dp. Settings → Rounding has an Auto / Fixed switch for each one, and the hint shows what this file got. The Logic sheet and the "How it works" sheet show the decimals that were actually used.
- **Duplicates are kept separate by default.** Users have usually already decided, so `dupMode` now defaults to `keep` and nothing is merged behind your back. The Duplicates tab has a **Smart merge N** button (merges only groups whose prices fall within the tolerance and whose names match exactly), "Merge shown", and per-group Merge/Separate. In Settings the order is Separate / Smart / Merge all. The Review filter only counts groups when an auto mode is on.
- **Settings migration.** Saved settings with the old defaults (`priceDec 4`, `qtyDec 2`, `dupMode smart`) move to the new defaults once (`sv: 3`). Values you changed yourself are kept.
- **Merge all sheets** now matches headers loosely across sheets (ignoring case, spaces and punctuation), so `Unit Price` and `unit price` end up in one column.

## Architecture
```
source rows (never changed) + doc (your edits) + settings + pack memory
        └──────────── Engine.compute() ────────────┘
                         │
     one result → sheet, units, duplicates, export, Logic explanations
```
- `js/engine.js`: pure logic. Parsing, unit parser, name reader (`readName`), resolver (`resolve`), column and direction detection, compute, filtering, export values.
- `js/logic.js`: explanations. Per-row reasoning, the logic sheet, the "How it works" summary, bench helper.
- `js/state.js`: store, undo/redo, settings (including detection defaults), memory, autosave.
- `js/ui.js`: UI kit. `js/app.js`: shell, import, Source view. `js/sheet.js`: virtual grid. `js/views.js`: Units, Duplicates, Columns, Settings. `js/export.js`: Export view and workbook writer.

## Entry
`index.html` (no parameters). Drop a file, paste rows, or try a sample.

## Storage
sessionStorage `bugvert2.tab` (last open tab for this browser tab). localStorage: `bugvert2.settings` (detection keys: `unitSource`, `nameMode`, `nameConf`, `namePats`, `nameMin`, `nameMax`, `nameMulti`, `flagConflict`, `guardWords`, `extraMeasures`, `order`, plus `expLogic`), `bugvert2.memory`, `bugvert2.session` (`src`, `doc`, `view`, `ts`). The old `useName:false` setting is migrated to `nameMode:'off'`.

## Not yet implemented
- Choosing which sheets to merge; header synonym mapping across sheets (e.g. `Price` ↔ `السعر`). Loose matching is done.
- Per-column override of the name column used for size reading

## Next steps
- Sheet picker for merging, header synonyms
- Learn new form words from user corrections

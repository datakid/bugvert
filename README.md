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
localStorage only: `bugvert2.settings` (detection keys: `unitSource`, `nameMode`, `nameConf`, `namePats`, `nameMin`, `nameMax`, `nameMulti`, `flagConflict`, `guardWords`, `extraMeasures`, `order`, plus `expLogic`), `bugvert2.memory`, `bugvert2.session`. The old `useName:false` setting is migrated to `nameMode:'off'`.

## Not yet implemented
- Choosing which sheets to merge; header synonym mapping across sheets
- Per-column override of the name column used for size reading

## Next steps
- Sheet picker for merging, header synonyms
- Learn new form words from user corrections

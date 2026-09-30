# bugvert — smart unit & price converter

Plain JavaScript app that reads a messy pharmacy/inventory table (xlsx, csv or pasted TSV), finds the unit column on its own, and converts pack units and prices (e.g. `10 T @ 17.115` → `1 T @ 1.7115`). Everything runs in the browser.

## Features
- Input: drag-and-drop .xlsx/.xls/.csv/.tsv, or paste straight from Excel (it analyzes as soon as you paste)
- Messy data: finds the header row, drops empty rows/columns and repeated headers, handles Arabic numerals, invisible direction marks, extra spaces, `10T` / `10  T` / `2x10 T` / `T10` / single words like `Syringe`
- Picks the unit, price, name and quantity columns from their contents plus header words (Arabic and English); each can be changed
- 15 unit families from aliases (tab, cap, supp, sachet, amp, vial, syringe, inh, bottle, tube, patch, drop, lozenge, box, strip). Unknown words become their own group that can still be converted
- Each column can have only one role. Picking a column that already has another role swaps the two, and table headers show a role badge
- Quantity is never multiplied by price. The Qty ↦ column appears only when "Rescale quantity to new unit" or merge is on
- Chips choose which units to convert; units already at 1 (Syringe, Inh) start off
- Direction: pack → single unit, or single unit → pack of N; quantity is scaled the opposite way to price
- Optional merge of same name + unit after conversion. Merged price: weighted by quantity, highest, lowest or first seen. Factor shows `mixed` when merged rows came from different packs. Merged rows whose prices differ by more than 50% are highlighted and reported
- Suggestions: unknown units, unreadable units, missing prices, possible merges, price conflicts, most common pack size
- Output: click column headers to select them → copy as TSV, copy all, or download .xlsx (selected or all columns)

## Entry point
- `index.html` (no URL parameters)

## Files
`index.html`, `css/style.css`, `js/app.js`, `js/xlsx.full.min.js` (SheetJS), `images/bugvert.svg`

## Storage
None. Data stays in memory in the browser.

## Not yet implemented / next steps
- Sheet picker for multi-sheet workbooks (first sheet is used)
- Custom alias editor saved to localStorage
- Editing the factor per row

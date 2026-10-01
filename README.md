# bugvert — smart unit & price converter

Plain JavaScript app that reads a messy pharmacy/inventory table (xlsx, csv or pasted TSV), finds the unit column on its own, and converts pack units and prices (e.g. `10 T @ 17.115` → `1 T @ 1.7115`). Everything runs in the browser.

## Features
- Input: drag-and-drop .xlsx/.xls/.csv/.tsv, or paste straight from Excel (it analyzes as soon as you paste)
- Messy data: finds the header row, drops empty rows/columns and repeated headers, handles Arabic numerals, invisible direction marks, extra spaces, `10T` / `10  T` / `2x10 T` / `T10` / single words like `Syringe`
- Picks the unit, price, name and quantity columns from their contents plus header words (Arabic and English); each can be changed
- Each column can have only one role. Picking a column that already has another role swaps the two, and table headers show a role badge
- 15 unit families from aliases (tab, cap, supp, sachet, amp, vial, syringe, inh, bottle, tube, patch, drop, lozenge, box, strip). Unknown words become their own group that can still be converted
- Chips choose which units to convert; units already at 1 (Syringe, Inh) start off
- Direction: pack → single unit, or single unit → pack of N
- Quantity: "Rescale quantity to new unit" adds a Qty ↦ column (the stock count in the new unit)
- Value: "Add value column" adds Value ↦ = Price ↦ × quantity. The quantity can be the rescaled Qty ↦ (keeps the total value correct) or the original quantity column
- Optional merge of same name + unit after conversion. Merged price: weighted by quantity, highest, lowest or first seen. Factor is left empty when merged rows came from different packs. Merged rows whose prices differ by more than 50% are highlighted and reported
- Suggestions: unknown units, unreadable units, missing prices, possible merges, price conflicts, most common pack size
- Export control:
  - Columns: tick/untick each column in the table header, or use the All / Original / New only / None buttons
  - Rows: filter (all, converted, unchanged, has price, has stock) plus a checkbox on every row
  - Copy TSV and Download .xlsx both export exactly the ticked columns and rows
  - Numbers are exported as real numbers and empty cells as truly empty, so Excel formulas work on the downloaded file

## Entry point
- `index.html` (no URL parameters)

## Files
`index.html`, `css/style.css`, `js/app.js`, `js/xlsx.full.min.js` (SheetJS), `images/bugvert.svg`

## Storage
None. Data stays in memory in the browser; nothing is saved between visits.

## Not yet implemented
- Settings panel (slide-in drawer) holding all options, with preferences saved in the browser
- Custom dropdowns, switches and steppers with one consistent style (native browser controls are used now)
- Simpler main flow: one start screen (drop / paste / sample) then a workspace, with a floating export bar
- Sheet picker for workbooks with several sheets (the first sheet with data is used)
- Unit dictionary editor: add your own unit spellings (e.g. `Btl` → Bottles), saved in the browser
- Per-row pack size / factor override
- Search box over the result table
- Rounding modes (nearest / up / down) and choice of unit label format (`1 T` vs `1 Tablet`)
- Custom suffix for the new column names
- Table density option
- Showing more than 1,500 rows on screen (export already includes all rows)

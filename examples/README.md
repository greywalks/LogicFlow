# Original sorting rules

Import `LogicFlow-Original-Rules.json` from **Import & export**, or during setup
step 2. Confirm **Use these rules**, save, and preview before starting.

Your existing local folder locations and exclusions are kept. Choose the watch,
organized and review folders separately on each computer. No usernames or
absolute folder locations are contained in this file. Checks still run every
30 seconds; only immediate watched items are considered.

## Folder layout

- AMC, Hisense, Philips, Promethean, Samsung and TCL each have Downloads, Excel,
  Guides, Images, Invoices, PDF, Word and ZPL.
- IT and USSI have those same folders except Invoices.
- Contracts is a direct destination without category subfolders.

There are eight name groups plus a global Contracts rule, producing the nine
original top-level folders. Contracts is deliberately a rule rather than a
second matching group so `AMC Contract.pdf` goes directly into Contracts.

## Rule order

1. Files containing the whole word **contract** or **contracts** go to Contracts.
2. Files matching one of the six client names and **invoice** or **invoices** go
   to that client's Invoices folder, then the MMYYYY read from the name.
3. Files matching a group and **guide** or **guides** go to that group's Guides.
4. Other matching files use the file-type folders below.
5. Unmatched items, unknown types, multiple group matches, and invoices with
   missing/conflicting dates go to the review folder you selected.

For example, `AMC Warehouse Invoice 092026.xlsx` goes to
`AMC/Invoices/092026`; `Samsung Guide.pdf` goes to `Samsung/Guides`.
Name matching uses whole words/phrases and ignores letter case.

| Folder | Extensions |
|---|---|
| Downloads | zip, 7z, rar, gz, tar, msi, exe, iso |
| Excel | xlsx, xls, xlsm, xlsb, xltx, xltm, csv, tsv, ods |
| Images | png, jpg, jpeg, gif, bmp, tif, tiff, webp, svg, heic, ico |
| PDF | pdf |
| Word | doc, docx, docm, dot, dotx, rtf, odt, txt, md |
| ZPL | zpl |

The invoice folders create January–December for the current year when organizing
starts. Dates from other years create their matching folders when needed.
Accepted name dates include MMYYYY, YYYY-MM, YYYY_MM, MM-YYYY and MM_YYYY.

These rules apply to files. Whole folders without an explicit folder rule go to
the review folder intact; their contents are never scanned. Your excluded folders
and current/previous output locations remain protected.

Assumptions: singular/plural contract, invoice and guide keywords; the app's
existing common extension lists, renamed to your requested folders, plus ZPL.

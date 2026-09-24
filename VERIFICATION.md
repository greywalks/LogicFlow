# LogicFlow 3.1.0 verification

Verified on September 24, 2026 in Linux with Node, Electron 44.4.3 and PowerShell
7.4.6. Tests used isolated temporary folders, not a real user's Desktop.

- **15 Node tests passed.** Cross-computer import/export, preserved local settings,
  unknown metadata removal, legacy version-1/BOM compatibility, invalid schema,
  oversized/malformed JSON, unsafe paths, duplicate groups/extensions, atomic
  settings backup, and actual worker IPC.
- **75 existing PowerShell engine checks passed.**
- **Original rule-file routing passed.** All six client invoice examples,
  Contracts, Guides, each file-type destination, unknown/ambiguous names and
  dates, intact nested folders, and the exact nine-root folder structure.
- **Electron UI checks passed.** Setup, folder/rule editors, exclusions,
  navigation, preview, start/pause, escaped text, and 1280×900/980×720 layouts.
- **Transfer integration passed using the real main process, preload and worker.**
  Import during setup, review/cancel, export and re-import, invalid-file recovery,
  paused import, unsaved-draft replacement, saved local locations/exclusions,
  and preview without moving test files. Native file pickers were mocked.
- Windows x64 installer compiled. Packaged app files and version matched source;
  installer payload and product metadata inspected.

Native Windows installation/uninstallation, Windows PowerShell 5.1, Windows
native dialogs, sign-in startup, tray behavior, file locking and high-DPI scaling
were not tested here. The executable is unsigned.

## Reproduce

Run `npm ci` and `npm test`. Tests run serially because the real worker enforces a
single running instance. Linux users set `LOGICFLOW_PWSH` to a compatible pwsh.
Run `engine/SelfTest.ps1` for engine checks. UI harnesses are in
`qa/ui-check.cjs` and `qa/transfer-check.cjs`; they use Playwright from
`CODEX_PRIMARY_RUNTIME_NODE_MODULES` and need an X display on Linux.

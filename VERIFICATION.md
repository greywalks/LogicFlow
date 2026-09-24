# LogicFlow 3.2.0 verification

Verified on September 24, 2026 in Linux with Node, Electron 44.4.3 and PowerShell
7.4.6. Tests used isolated temporary folders, not a real user's Desktop.

- **16 Node tests passed.** Cross-computer import/export, preserved local settings,
  unknown metadata removal, legacy version-1/BOM compatibility, invalid schema,
  oversized/malformed JSON, unsafe paths, duplicate groups/extensions, atomic
  settings backup, actual worker IPC, and one-time preparation/cancellation.
- **75 existing PowerShell engine checks passed.**
- **13 one-time engine checks passed.** Two-check readiness, original-batch limits,
  changed/deleted items, exclusions, intact folders and collision handling.
- **Original rule-file routing passed.** All six client invoice examples,
  Contracts, Guides, each file-type destination, unknown/ambiguous names and
  dates, intact nested folders, and the exact nine-root folder structure.
- **Electron UI checks passed.** Setup, folder/rule editors, exclusions,
  navigation, preview, start/pause, escaped text, and 1280×900/980×720 layouts.
- **Transfer integration passed using the real main process, preload and worker.**
  Import during setup, review/cancel, export and re-import, invalid-file recovery,
  paused import, unsaved-draft replacement, saved local locations/exclusions,
  and preview without moving test files. Native file pickers were mocked.
- **Run Now integration passed using the real main process, preload and worker.**
  Confirmation, cancellation, switching from automatic mode, the real 30-second
  readiness check, stable-item moves, changed-item skips, later arrivals left in
  place, completion summary, error cleanup and the 980×720 layout. After the run
  completed, the test waited another 32 seconds and observed no worker requests
  or further moves. PowerShell telemetry was disabled before process startup.
- Windows x64 installer compiled. Packaged app files and version matched source;
  installer payload and product metadata inspected.

Native Windows installation/uninstallation, Windows PowerShell 5.1, Windows
native dialogs, sign-in startup, tray behavior, file locking and high-DPI scaling
were not tested here. The executable is unsigned.

## Reproduce

Run `npm ci` and `npm test`. Tests run serially because the real worker enforces a
single running instance. Linux users set `LOGICFLOW_PWSH` to a compatible pwsh
and `POWERSHELL_TELEMETRY_OPTOUT=1` before starting direct PowerShell checks.
The application's worker sets the telemetry opt-out itself.
Run `engine/SelfTest.ps1` and `engine/RunOnceTest.ps1` for engine checks.
UI harnesses are in `qa/ui-check.cjs`, `qa/transfer-check.cjs` and
`qa/run-now-check.cjs`; they use Playwright from
`CODEX_PRIMARY_RUNTIME_NODE_MODULES` and need an X display on Linux.

# LogicFlow — Project Brief

**Release:** 3.1.0  
**Author:** Cisik  
**Target:** Windows 11 x64  
**Deliverable:** LogicFlow-Setup.exe; LogicFlow-v3.1-Complete.zip

## Product

Per-user folder organizer with an Electron desktop window, compiled Tailwind
styles, native folder pickers and a PowerShell worker. This replaces the prior
Windows Forms interface. It is a desktop app, not a Flask server or website.

## Rule transfer added in 3.1

Dedicated Import & export navigation, import during setup, a review before rule
replacement, clear invalid-file errors, and strict portable-only field validation.
Each computer keeps its own paths, exclusions, protections and sign-in choice.
The optional original-rules JSON is supplied separately, never auto-loaded.

## Implemented changes

- Modern dark UI with scalable text, consistent cards, tables and forms.
- Standard executable installer with shortcuts and Installed Apps registration;
  executable uninstaller keeps user data. Product and author metadata included.
- One selectable watch folder, suggested from the current user's real Desktop.
- Five-step setup: folders, file types, custom rules, leave alone, review.
- Simple wording and folder-name inputs instead of relative-path terminology.
- General name-based rules with file/folder scope, destination selection, optional
  date grouping and explicit order. No preconfigured invoice or company rules.
- Exclusions selected with a native picker, limited to immediate watched folders.
- Per-user data under `%LOCALAPPDATA%\LogicFlow`; executable under
  `%LOCALAPPDATA%\Programs\LogicFlow`. Existing LogicFlow settings stay local.

## Non-negotiable behavior

Only immediate watch-folder items are enumerated every 30 seconds. Never recurse
or reorganize destination contents. Folders move intact. Exclusions win. Custom
rules precede extensions. Ambiguous group/date matches go to review. Keep stable
observations, exclusive file availability checks, numbered collisions, history,
old destination protection, preview without movement and paused setup.

Every app launch starts paused. Editing/picking folders pauses sorting. A preview
is required after changes. Output locations must be separate and on the source
drive. Folders further inside the watched folder cannot be selected as exclusions
because they are never scanned. Watch-folder changes clear local exclusions.

## Architecture

| Path | Responsibility |
|---|---|
| src/main.cjs | Window, restricted IPC, queue, user data, startup, tray, file pickers |
| src/preload.cjs | Explicit isolated renderer API |
| src/renderer.js | Setup and application UI, rule forms and wording |
| src/styles.css / app.css | Tailwind source / compiled local styles |
| src/config.cjs | Profile normalization, atomic saves and rule-only transfer |
| src/worker.cjs | Persistent JSON-line child-process bridge |
| engine/Engine.ps1 | Validation, immediate-folder scan, routing and safe moves |
| engine/Worker.ps1 | Fixed command dispatch and stable observations |
| engine/SelfTest.ps1 | Isolated engine regressions |
| installer/*.nsi | Per-user install and removal executables |
| scripts/*.cjs | Product resource metadata and NSIS build orchestration |
| test/*.test.cjs | Configuration and worker integration tests |
| qa/*.cjs | Renderer and main/preload integration harnesses |

Renderer is sandboxed, context-isolated, and has no Node integration. CSP denies
remote content. IPC checks the owning main frame and serializes operations.
The worker accepts structured data, not user-supplied script text. Actual moves
still use .NET same-drive operations without overwriting. Long scans run outside
the UI renderer.

## Packaging

`npm run dist` compiles CSS, creates the Windows Electron directory, edits PE
icon/version/author metadata in JavaScript, and compiles separate NSIS install
and removal executables. This avoids needing to execute Windows build programs
on Linux. NSIS 3 must be installed; MAKENSIS and NSISDIR can specify its location.
The shipped installer is unsigned. It includes the runtime; users do not install
Node, npm, Flask, Python, or a separate browser.

## Verification and remaining work

Current build verification and platform limits are recorded in `VERIFICATION.md`.
Windows installation/uninstallation, PowerShell 5.1, native pickers, sign-in
startup, tray, file locks and high-DPI behavior require native Windows validation.

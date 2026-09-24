# LogicFlow 3.1

**Author: Cisik** · Windows 11, 64-bit

## Install

1. Exit any open copy of LogicFlow using its app or notification-area menu.
2. Double-click **LogicFlow-Setup.exe** and follow the installer.
3. Open LogicFlow, choose your folders and finish setup.
4. Review the preview, then select **Start organizing**.

No command prompt, Node.js, Python, Flask server or separate browser is needed.
The application includes its own desktop interface. It uses the Windows
PowerShell 5.1 already included with Windows for file operations. Organizational
application/script policies still apply. This build is unsigned.

## Set up your folders

**Folder to organize** is the one location LogicFlow checks. Desktop is suggested
using the current Windows user's actual Desktop location. Use **Choose folder**
to choose somewhere else. Each person's paths are detected on their computer;
no author's username, company rules or personal folder locations are bundled.

**Put organized files here** is where matching items go. **Put other items here**
is where unmatched items go for review. Use separate output folders on the same
drive as the watched folder. Cross-drive and network output folders are not
supported. Existing content is not relocated when you change these choices.

Only items directly inside the watched folder are checked, every 30 seconds.
LogicFlow never scans inside subfolders or reorganizes your output folders.
Folders move as complete units with everything inside them preserved.

## File types and name groups

The five initial file-type folders are Documents, Spreadsheets, PDFs, Images and
Packages. Rename, remove or add them. Enter a folder name such as **Reports**;
you do not need to type a full file path. Enter file types separated by commas,
for example **pdf, docx**. A leading dot is optional.

Name groups are optional. For example, a **Garden** group can match names
containing **garden** or **plants**, then put documents under Garden/Documents.
There are no prefilled groups. Words match whole words or phrases rather than
parts of longer words. Multiple matching groups send an item to the review
folder rather than guessing. Root file-type fallback is an explicit checkbox.

## Custom rules

Select **Add a rule**, then choose:

- Words to look for, separated by commas. Any listed word or phrase can match.
- Whether the rule applies to files, whole folders, or both.
- The destination folder name, or browse to an existing folder inside your
  organized-files folder. Rules scoped to a name group use that group's folder.
- Optionally, a month-and-year folder based on a date in the item name.

Rules run from top to bottom, before file-type rules. Use the arrows to change
which rule wins. For example, a **holiday** rule can route a PDF into **Trips**
instead of **PDFs**. Rules are completely user-defined; none are added by default.

Date grouping accepts MMYYYY, YYYY-MM, YYYY_MM, MM-YYYY or MM_YYYY for years
1900–2199. The output folder uses MMYYYY. Missing or conflicting dates go to the
review folder. File timestamps are never used to guess a date.

## Leave folders alone

Use **Choose a folder** under **Leave alone**. Pick a folder directly inside the
watched folder. It and everything inside it stay untouched. Use **Remove** to
stop excluding it. No typed paths are required. Changing the watched folder
clears these selections so you can choose folders at the new location.

Output folders and previously used output locations are protected automatically.
Renaming a folder you excluded requires selecting its new name.

## Preview, pause and activity

Setup starts paused. Preview does not move files. Changes pause organizing;
save and preview before starting. Files must be seen unchanged on two checks
at least 30 seconds apart before moving. Locked files are retried. Folder
readiness uses only the folder's own metadata: pause while copying into a folder.

Files and folders are never overwritten or merged. Name collisions receive a
numbered suffix. Activity records the start and completion of moves, plus errors.
If a crash leaves only a start entry, check both locations before correcting it.
Automatic undo is not included. Pause and adjust a rule before restoring an item.

Closing the window hides it in the notification area. Choose **Exit LogicFlow**
to stop it. Optional sign-in launch opens paused. LogicFlow always starts paused
after a new launch, including an upgrade.

## Your settings

Settings and history belong to the signed-in Windows user:

- `%LOCALAPPDATA%\LogicFlow\settings.json`
- `%LOCALAPPDATA%\LogicFlow\settings.json.bak`
- `%LOCALAPPDATA%\LogicFlow\history.jsonl`

The application installs under `%LOCALAPPDATA%\Programs\LogicFlow`. A current
user's existing LogicFlow 2.1 settings remain theirs and gain Desktop as the
initial watched folder. Other users receive a fresh setup. The installer removes
the older LogicFlow startup shortcut; set your sign-in preference in the new app.
No other applications' profiles are imported.

## Import and export rules

Open **Import & export** in the left menu.

- **Export rules** saves your current name groups, custom rules in their order,
  file-type folders and file-type fallback choice to a `.json` file. Unsaved
  edits shown in the app are included. Copy this file to the other computer.
- **Import rules** opens a file picker, pauses organizing, validates the file,
  and shows its groups and rule counts. Select **Use these rules** to replace
  the current sorting choices, then **Save changes**. Open **Overview**, refresh
  the preview and check the destinations before starting.
- First-time users can import on setup step 2, **File types**, after choosing
  their local folders. Continue setup to review and save the imported choices.

Import replaces groups, custom rules, file types and the fallback choice; it
keeps this computer's watch folder, output folders, exclusions, sign-in choice,
protected locations and activity. Canceling the review keeps your current edits.
Invalid files leave your rules unchanged. Import always leaves organizing paused.
Version-1 rules exports from LogicFlow 3.0 are accepted, including UTF-8 BOM files.
The file size limit is 500 KB. Rules are data only and cannot contain absolute
output paths or paths that escape the organized-files folder.

The separate optional `examples/LogicFlow-Original-Rules.json` contains the
original requested personal sorting layout. Its companion README explains
all mappings. It is never loaded automatically or used as a new user's defaults.
Share the installer for a clean setup, and share a rules JSON only when you want
another person or computer to use those sorting choices.

Remove LogicFlow through Windows **Settings → Apps → Installed apps**. Uninstall
keeps settings, history and organized files. The uninstaller stages a small
copy in the Windows temporary folder so it can remove the installed app.

## Verification

This release includes Node unit tests for portable rule transfer and validation,
real-worker routing checks for the supplied rule file, PowerShell engine checks,
and Electron UI/integration harnesses. See `VERIFICATION.md` for the results and
platform limits of this build. Native Windows installation and PowerShell 5.1
behavior require Windows validation.

## Build from source (developers only)

Install Node.js 22.12+ or 24 and NSIS 3. Run:

```text
npm ci
npm test
npm run dist
```

Make `makensis` available on PATH or set the `MAKENSIS` environment variable to
its full location. For nonstandard NSIS layouts also set `NSISDIR` to the NSIS
root containing Include, Stubs and Plugins. Output: `release/LogicFlow-Setup.exe`.
On Windows the worker tests use the built-in PowerShell. Linux developers can
set `LOGICFLOW_PWSH` to a PowerShell 7 executable. To run isolated engine checks:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File engine\SelfTest.ps1
```

The source uses Electron and locally compiled Tailwind CSS. No remote pages,
CDN assets or web server are used at runtime. File access stays in a restricted
main-process bridge and the PowerShell worker; the renderer has no Node access.
Installer source includes installation, product metadata, shortcuts, application
registration, running-app checks and a separate executable uninstaller.

## GitHub repository

Use the contents of this `Source` folder as the repository root: `package.json`,
`package-lock.json`, `README.md`, `src/`, `assets/`, `engine/`, `installer/`,
`scripts/`, `test/` and `qa/`. Include the `.gitignore` file.
Dependencies and generated installers are excluded from Git. Distribute
`LogicFlow-Setup.exe` as a release download separately from the source.
Repository: https://github.com/greywalks/LogicFlow

## Icon update

The supplied LogicFlow artwork is in `assets/icon.png`, with a multi-resolution
Windows icon in `assets/icon.ico` (16 through 256 pixels). These supply the
setup screens, sidebar, window/tray, application executable, shortcuts, installer
and removal executable. Run `npm run dist` after changing either asset.
The installer in this package was rebuilt with these assets. Native Windows
installation and icon-cache behavior still require validation on Windows.

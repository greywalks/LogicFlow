Unicode true
RequestExecutionLevel user
SetCompressor /SOLID zlib
!include "MUI2.nsh"
!include "LogicLib.nsh"
!include "x64.nsh"
!include "FileFunc.nsh"
!define PRODUCT "LogicFlow"
!define UNINSTALL_KEY "Software\Microsoft\Windows\CurrentVersion\Uninstall\LogicFlow"
InstallDir "$LOCALAPPDATA\Programs\LogicFlow"
Icon "..\assets\icon.ico"
VIProductVersion "3.0.0.0"
VIAddVersionKey /LANG=1033 "ProductName" "LogicFlow"
VIAddVersionKey /LANG=1033 "CompanyName" "Cisik"
VIAddVersionKey /LANG=1033 "LegalCopyright" "Copyright © 2026 Cisik"
VIAddVersionKey /LANG=1033 "FileVersion" "3.0.0"
VIAddVersionKey /LANG=1033 "ProductVersion" "3.0.0"
!define MUI_ICON "..\assets\icon.ico"
!define MUI_ABORTWARNING
Function CheckRunning
  System::Call 'kernel32::OpenMutexW(i 0x100000, i 0, w "Local\LogicFlow") p.r0'
  ${If} $0 != 0
    System::Call 'kernel32::CloseHandle(p r0)'
    MessageBox MB_ICONEXCLAMATION|MB_OK "LogicFlow is open. Choose Exit LogicFlow in the app or its notification-area menu, then try again."
    Abort
  ${EndIf}
FunctionEnd

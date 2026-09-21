!include "common.nsh"
Name "Remove LogicFlow"
OutFile "..\release\LogicFlow-Uninstall.exe"
VIAddVersionKey /LANG=1033 "FileDescription" "LogicFlow Uninstaller"
!define MUI_WELCOMEPAGE_TITLE "Remove LogicFlow"
!define MUI_WELCOMEPAGE_TEXT "This removes the LogicFlow application and its shortcuts.$\r$\n$\r$\nYour settings, move history and organized files will be kept."
!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_INSTFILES
!define MUI_FINISHPAGE_TITLE "LogicFlow has been removed"
!define MUI_FINISHPAGE_TEXT "Your settings, move history and organized files are still on this computer."
!insertmacro MUI_PAGE_FINISH
!insertmacro MUI_LANGUAGE "English"
Function .onInit
  SetShellVarContext current
  Call CheckRunning
  ${GetParameters} $R0
  ${If} $R0 != "/REMOVE"
    InitPluginsDir
    GetTempFileName $R1
    Delete "$R1"
    CreateDirectory "$R1"
    CopyFiles /SILENT "$EXEPATH" "$R1\LogicFlow-Uninstall.exe"
    IfErrors 0 +3
      MessageBox MB_ICONSTOP "LogicFlow could not prepare its uninstaller. Please try again."
      Abort
    Exec '"$R1\LogicFlow-Uninstall.exe" /REMOVE'
    Quit
  ${EndIf}
FunctionEnd
Section "Remove application"
  Call CheckRunning
  SetShellVarContext current
  ; Never read an arbitrary delete path from command-line arguments or registry.
  StrCpy $INSTDIR "$LOCALAPPDATA\Programs\LogicFlow"
  Delete "$DESKTOP\LogicFlow.lnk"
  Delete "$SMPROGRAMS\LogicFlow.lnk"
  DeleteRegValue HKCU "Software\Microsoft\Windows\CurrentVersion\Run" "LogicFlow"
  RMDir /r "$INSTDIR"
  ${If} ${FileExists} "$INSTDIR\LogicFlow.exe"
    MessageBox MB_ICONSTOP "Some application files are in use. Close LogicFlow and run this uninstaller again."
    Abort
  ${EndIf}
  DeleteRegKey HKCU "${UNINSTALL_KEY}"
SectionEnd

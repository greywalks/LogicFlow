!include "common.nsh"
Name "LogicFlow"
OutFile "..\release\LogicFlow-Setup.exe"
VIAddVersionKey /LANG=1033 "FileDescription" "LogicFlow Setup"
!define MUI_WELCOMEPAGE_TITLE "Welcome to LogicFlow"
!define MUI_WELCOMEPAGE_TEXT "LogicFlow helps you keep your files organized with rules you choose.$\r$\n$\r$\nThis installs LogicFlow for your Windows account. Your setup and rules stay private to your account.$\r$\n$\r$\nAuthor: Cisik"
!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_INSTFILES
!define MUI_FINISHPAGE_TITLE "LogicFlow is ready"
!define MUI_FINISHPAGE_TEXT "Open LogicFlow to choose your folders and rules. Nothing moves until you start organizing."
!define MUI_FINISHPAGE_RUN "$INSTDIR\LogicFlow.exe"
!define MUI_FINISHPAGE_RUN_TEXT "Open LogicFlow"
!insertmacro MUI_PAGE_FINISH
!insertmacro MUI_LANGUAGE "English"
Function .onInit
  SetShellVarContext current
  ${IfNot} ${RunningX64}
    MessageBox MB_ICONSTOP "This installer needs a 64-bit version of Windows."
    Abort
  ${EndIf}
  Call CheckRunning
FunctionEnd
Section "Install LogicFlow"
  Call CheckRunning
  SetShellVarContext current
  SetOutPath "$INSTDIR"
  SetOverwrite on
  ClearErrors
  File /r "..\release\win-unpacked\*.*"
  File /oname=LogicFlow-Uninstall.exe "..\release\LogicFlow-Uninstall.exe"
  ${If} ${Errors}
    MessageBox MB_ICONSTOP "LogicFlow could not copy all its files. Close any running copy and try again."
    Abort
  ${EndIf}
  Delete "$SMSTARTUP\LogicFlow.lnk"
  CreateShortcut "$DESKTOP\LogicFlow.lnk" "$INSTDIR\LogicFlow.exe"
  CreateShortcut "$SMPROGRAMS\LogicFlow.lnk" "$INSTDIR\LogicFlow.exe"
  WriteRegStr HKCU "${UNINSTALL_KEY}" "DisplayName" "LogicFlow"
  WriteRegStr HKCU "${UNINSTALL_KEY}" "DisplayVersion" "3.0.0"
  WriteRegStr HKCU "${UNINSTALL_KEY}" "Publisher" "Cisik"
  WriteRegStr HKCU "${UNINSTALL_KEY}" "DisplayIcon" "$INSTDIR\LogicFlow.exe"
  WriteRegStr HKCU "${UNINSTALL_KEY}" "InstallLocation" "$INSTDIR"
  WriteRegStr HKCU "${UNINSTALL_KEY}" "UninstallString" '$\"$INSTDIR\LogicFlow-Uninstall.exe$\"'
  WriteRegDWORD HKCU "${UNINSTALL_KEY}" "NoModify" 1
  WriteRegDWORD HKCU "${UNINSTALL_KEY}" "NoRepair" 1
  WriteRegDWORD HKCU "${UNINSTALL_KEY}" "EstimatedSize" 400000
SectionEnd

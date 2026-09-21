# LogicFlow 3.0 | Author: Cisik
# JSON-lines protocol; the renderer never supplies commands or PowerShell code.
$ErrorActionPreference='Stop'
[Console]::InputEncoding=New-Object Text.UTF8Encoding($false)
[Console]::OutputEncoding=New-Object Text.UTF8Encoding($false)
. (Join-Path $PSScriptRoot 'Engine.ps1')
$lock=New-Object Threading.Mutex($false,'Local\LogicFlow')
if(!$lock.WaitOne(0)){[Console]::Error.WriteLine('Exit the other copy of LogicFlow first.');exit 1}
$observed=@{}
while($null -ne ($line=[Console]::ReadLine())) {
    try {
        $request=$line | ConvertFrom-Json
        $c=$request.config
        switch($request.action) {
            'defaults' { $result=New-LogicFlowConfig $request.watch }
            'validate' {Check-Config $c $c.WatchFolder;$result=$true}
            'preview' {
                $result=@(Get-Preview $c $c.WatchFolder | Select-Object Name,Type,Destination,Reason,Folder)
            }
            'reset' {$observed=@{};$result=$true}
            'initialize' {Initialize-Structure $c $c.WatchFolder;$observed=@{};$result=$true}
            'cycle' {$result=Invoke-Sort $c $c.WatchFolder $observed $request.log}
            'history' {
                $result=@()
                if(Test-Path -LiteralPath $request.log) {
                    $result=@(Get-Content -LiteralPath $request.log -Tail 500 | ForEach-Object {try{$_ | ConvertFrom-Json}catch{}})
                    [array]::Reverse($result)
                }
            }
            default {throw 'This request is not supported.'}
        }
        [Console]::WriteLine((@{ok=$true;value=$result} | ConvertTo-Json -Depth 15 -Compress))
    } catch {
        [Console]::WriteLine((@{ok=$false;error=$_.Exception.Message} | ConvertTo-Json -Depth 5 -Compress))
    }
}

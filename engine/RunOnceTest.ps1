# Isolated readiness and batch-boundary checks; never uses the real Desktop.
$ErrorActionPreference='Stop'
. (Join-Path $PSScriptRoot 'Engine.ps1')
$root=Join-Path ([IO.Path]::GetTempPath()) ('LogicFlowOnce-'+[guid]::NewGuid().ToString('N'))
[void][IO.Directory]::CreateDirectory($root)
$script:passed=0
function Assert($condition,[string]$message){if(!$condition){throw "FAIL: $message"};$script:passed++}
function OldFile([string]$name,[string]$text='original'){
    $p=Join-Path $root $name;[IO.File]::WriteAllText($p,$text)
    (Get-Item -LiteralPath $p).LastWriteTimeUtc=[datetime]::UtcNow.AddMinutes(-2)
}
try {
    $c=New-LogicFlowConfig $root
    $c.ExcludedFolders=@('Keep')
    Initialize-Structure $c $root
    OldFile 'notes.txt';OldFile 'changing.txt';OldFile 'gone.txt';OldFile 'download.part'
    [void][IO.Directory]::CreateDirectory((Join-Path $root 'Keep'))
    [IO.File]::WriteAllText((Join-Path $root 'Keep/inner.txt'),'leave alone')
    [void][IO.Directory]::CreateDirectory((Join-Path $root 'Whole folder/nested'))
    [IO.File]::WriteAllText((Join-Path $root 'Whole folder/nested/inside.txt'),'intact')
    (Get-Item -LiteralPath (Join-Path $root 'Whole folder')).LastWriteTimeUtc=[datetime]::UtcNow.AddMinutes(-2)
    [IO.File]::WriteAllText((Join-Path $c.Destination 'Documents/notes.txt'),'existing')
    $log=Join-Path $root 'test-history.jsonl';$c.Protected+=,$log
    $seen=@{};$first=Invoke-Sort $c $root $seen $log
    Assert ($first.Moved -eq 0) 'Initial readiness check moves nothing'
    Assert ($seen.Count -eq 4) 'Batch excludes excluded folders, partial downloads and output folders'
    $paths=@{};foreach($key in $seen.Keys){$paths[$key]=$true}
    $early=Invoke-Sort $c $root $seen $log $paths
    Assert ($early.Moved -eq 0) 'A second check before 30 seconds cannot move items'
    # Advance only observation timestamps; the production worker waits 30 seconds.
    foreach($key in $seen.Keys){$seen[$key].Since=[datetime]::UtcNow.AddMinutes(-2)}
    OldFile 'later.txt'
    [IO.File]::AppendAllText((Join-Path $root 'changing.txt'),'changed while checking')
    [IO.File]::Delete((Join-Path $root 'gone.txt'))
    $last=Invoke-Sort $c $root $seen $log $paths
    Assert ($last.Moved -eq 2) 'Only ready items from the original batch move'
    Assert (Test-Path -LiteralPath (Join-Path $root 'later.txt')) 'Later arrivals stay untouched'
    Assert (Test-Path -LiteralPath (Join-Path $root 'changing.txt')) 'Changed files stay untouched'
    Assert (Test-Path -LiteralPath (Join-Path $root 'download.part')) 'Partial downloads stay untouched'
    Assert (([IO.File]::ReadAllText((Join-Path $c.Destination 'Documents/notes.txt'))) -eq 'existing') 'Existing file is not overwritten'
    Assert (([IO.File]::ReadAllText((Join-Path $c.Destination 'Documents/notes (1).txt'))) -eq 'original') 'Collision gets a suffix'
    Assert (([IO.File]::ReadAllText((Join-Path $root 'Keep/inner.txt'))) -eq 'leave alone') 'Excluded contents stay untouched'
    Assert (([IO.File]::ReadAllText((Join-Path $c.Unclassified 'Whole folder/nested/inside.txt'))) -eq 'intact') 'Folders move intact without scanning inside'
    Assert ($last.Errors -eq 0) 'Batch completes without errors'
    Assert (($paths.Count-$last.Moved-$last.Errors) -eq 2) 'Changed and removed items are counted as skipped'
    Write-Output "PASS: $script:passed Run Now engine checks"
} finally {Remove-Item -LiteralPath $root -Recurse -Force}

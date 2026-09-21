# LogicFlow 3.0 | Author: Cisik
# Uses only a unique temporary test directory. Never accesses the real Desktop.
$ErrorActionPreference='Stop'
. (Join-Path $PSScriptRoot 'Engine.ps1')
$root=Join-Path ([IO.Path]::GetTempPath()) ('LogicFlowTests-'+[guid]::NewGuid().ToString('N'))
[void][IO.Directory]::CreateDirectory($root)
$script:passed=0
function Assert($condition,[string]$message) {if(!$condition){throw "FAIL: $message"};$script:passed++}
function Fake([string]$Name,[bool]$Directory=$false) {[pscustomobject]@{Name=$Name;PSIsContainer=$Directory;Extension=[IO.Path]::GetExtension($Name)}}
try {
    $c=New-LogicFlowConfig $root @('Alpha','Beta','IT','Gamma','Delta','Omega','Theta','Operations')
    $c.RootCategories=$false
    $c.Rules=@([pscustomobject]@{Priority=10;Scope='*';Words='contract;contracts';Subfolder='Contracts';Dated=$false;Kind='Files'})
    foreach($group in @('Alpha','Beta','Gamma','Delta','Omega','Theta')) {
        $c.Rules+=[pscustomobject]@{Priority=20;Scope=$group;Words='invoice;invoices';Subfolder='Invoices';Dated=$true;Kind='Files'}
    }
    foreach($group in $c.Groups) {
        $c.Rules+=[pscustomobject]@{Priority=30;Scope=$group.Folder;Words='guide;guides';Subfolder='Guides';Dated=$false;Kind='Files'}
    }
    Check-Config $c $root
    $cases=@(
        @('Alpha stock.xlsx','Organized Files\Alpha\Spreadsheets'),
        @('Alpha Warehouse Invoice 092026.xlsx','Organized Files\Alpha\Invoices\092026'),
        @('Omega Invoice 012027.pdf','Organized Files\Omega\Invoices\012027'),
        @('Gamma Invoice 2026-09.pdf','Organized Files\Gamma\Invoices\092026'),
        @('Beta Invoice 09-2026.pdf','Organized Files\Beta\Invoices\092026'),
        @('Theta GUIDE.pdf','Organized Files\Theta\Guides'),
        @('Alpha Contract.pdf','Organized Files\Contracts'),
        @('Operations drawing.png','Organized Files\Operations\Images'),
        @('IT instructions.docx','Organized Files\IT\Documents'),
        @('shipping.docx','Unclassified Items'),
        @('Alpha Omega.xlsx','Unclassified Items'),
        @('Alpha unknown.xyz','Unclassified Items'),
        @('Alpha invoice.pdf','Unclassified Items'),
        @('Alpha invoice 132026.pdf','Unclassified Items'),
        @('Alpha invoice 092026 102026.xlsx','Unclassified Items'),
        @('random.xlsx','Unclassified Items'),
        @('Omegaish.xlsx','Unclassified Items')
    )
    foreach($case in $cases){$route=Get-Route (Fake $case[0]) $c;Assert ((Full-Path $route.Folder) -eq (Full-Path (Join-Path $root $case[1]))) $case[0]}
    Assert ((Get-Route (Fake 'Alpha stuff' $true) $c).Folder -eq $c.Unclassified) 'Folders need explicit folder rules'
    $c.Rules+= [pscustomobject]@{Priority=5;Scope='Alpha';Words='Archive';Subfolder='Archives';Dated=$false;Kind='Folders'}
    Assert ((Get-Route (Fake 'Alpha Archive' $true) $c).Folder -eq (Join-Path $c.Destination 'Alpha\Archives')) 'Explicit folder rule'
    [void][IO.Directory]::CreateDirectory((Join-Path $root 'Project\nested'))
    [IO.File]::WriteAllText((Join-Path $root 'Project\nested\Alpha stock.xlsx'),'keep inside folder')
    [IO.File]::WriteAllText((Join-Path $root 'Alpha stock.xlsx'),'new file')
    [IO.File]::WriteAllText((Join-Path $root 'shortcut.lnk'),'leave')
    [IO.File]::WriteAllText((Join-Path $root 'Alpha download.crdownload'),'partial')
    [void][IO.Directory]::CreateDirectory((Join-Path $c.Destination 'Alpha\Spreadsheets'))
    [IO.File]::WriteAllText((Join-Path $c.Destination 'Alpha\Spreadsheets\Alpha stock.xlsx'),'existing file')
    [void][IO.Directory]::CreateDirectory((Join-Path $c.Destination 'Custom'))
    [IO.File]::WriteAllText((Join-Path $c.Destination 'Custom\unmatched.txt'),'custom arrangement')
    $rows=@(Get-Preview $c $root)
    Assert ($rows.Count -eq 2) 'Only eligible top-level items previewed'
    Assert (Test-Path -LiteralPath (Join-Path $root 'Alpha stock.xlsx')) 'Preview does not move files'
    (Get-Item -LiteralPath (Join-Path $root 'Project')).LastWriteTimeUtc=[datetime]::UtcNow.AddMinutes(-2)
    (Get-Item -LiteralPath (Join-Path $root 'Alpha stock.xlsx')).LastWriteTimeUtc=[datetime]::UtcNow.AddMinutes(-2)
    $log=Join-Path $root 'test-history.jsonl';$c.Protected+=,$log;$seen=@{}
    $first=Invoke-Sort $c $root $seen $log
    Assert ($first.Moved -eq 0) 'First observation never moves'
    foreach($key in @($seen.Keys)){$seen[$key].Since=[datetime]::UtcNow.AddMinutes(-2)}
    $second=Invoke-Sort $c $root $seen $log
    Assert ($second.Moved -eq 2) 'Second stable observation moves file and intact folder'
    Assert (Test-Path -LiteralPath (Join-Path $c.Unclassified 'Project\nested\Alpha stock.xlsx')) 'Nested content preserved'
    Assert (([IO.File]::ReadAllText((Join-Path $c.Destination 'Alpha\Spreadsheets\Alpha stock.xlsx'))) -eq 'existing file') 'Collision does not overwrite'
    Assert (Test-Path -LiteralPath (Join-Path $c.Destination 'Alpha\Spreadsheets\Alpha stock (1).xlsx')) 'Collision renamed'
    Assert (Test-Path -LiteralPath (Join-Path $c.Destination 'Custom\unmatched.txt')) 'Custom LogicFlow content untouched'
    Assert ((@(Get-Preview $c $root)).Count -eq 0) 'No recursive reprocessing'
    $bad=$c | ConvertTo-Json -Depth 12 | ConvertFrom-Json;$bad.Destination=$root
    $rejected=$false;try{Check-Config $bad $root}catch{$rejected=$true};Assert $rejected 'Desktop cannot be destination'
    $bad=$c | ConvertTo-Json -Depth 12 | ConvertFrom-Json;$bad.Rules[0].Subfolder='..\escape'
    $rejected=$false;try{Check-Config $bad $root}catch{$rejected=$true};Assert $rejected 'Traversal rejected'
    $bad=$c | ConvertTo-Json -Depth 12 | ConvertFrom-Json;$bad.Unclassified=Join-Path $c.Destination 'Unclassified Items'
    $rejected=$false;try{Check-Config $bad $root}catch{$rejected=$true};Assert $rejected 'Nested destinations rejected'
    $oldRoot=Join-Path $root 'Previous destination'
    [void][IO.Directory]::CreateDirectory($oldRoot);$c.Protected+=,$oldRoot
    Assert ((@(Get-Preview $c $root)).Count -eq 0) 'Previous destinations stay protected'
    $configCopy=$c | ConvertTo-Json -Depth 12 | ConvertFrom-Json
    $configCopy.Extensions+= [pscustomobject]@{Extensions='.xlsx';Folder='Duplicate'}
    $rejected=$false;try{Check-Config $configCopy $root}catch{$rejected=$true};Assert $rejected 'Duplicate extensions rejected'
    Assert ((Get-Route (Fake 'alpha_inventory.XLSX') $c).Folder -eq (Join-Path $c.Destination 'Alpha\Spreadsheets')) 'Case-insensitive names and extensions'
    $c.Groups[5].Aliases='Omega;OM'
    Assert ((Get-Route (Fake 'OM stock.xlsx') $c).Folder -eq (Join-Path $c.Destination 'Omega\Spreadsheets')) 'Editable aliases work'
    Assert ((Get-Route (Fake 'Operations Invoice 092026.pdf') $c).Folder -eq (Join-Path $c.Destination 'Operations\PDFs')) 'No invoice rule for Operations by default'
    [void][IO.Directory]::CreateDirectory((Join-Path $c.Unclassified 'Same folder'))
    Assert ((Unique-Destination $c.Unclassified 'Same folder' $true) -eq (Join-Path $c.Unclassified 'Same folder (1)')) 'Folder collision naming'
    $changing=Join-Path $root 'Alpha changing.xlsx'
    [IO.File]::WriteAllText($changing,'v1');(Get-Item -LiteralPath $changing).LastWriteTimeUtc=[datetime]::UtcNow.AddMinutes(-2)
    $seen=@{};$null=Invoke-Sort $c $root $seen $log
    foreach($key in @($seen.Keys)){$seen[$key].Since=[datetime]::UtcNow.AddMinutes(-2)}
    [IO.File]::WriteAllText($changing,'v2 with more bytes')
    $cycle=Invoke-Sort $c $root $seen $log
    Assert ($cycle.Moved -eq 0 -and (Test-Path -LiteralPath $changing)) 'Changing file waits instead of moving'
    Remove-Item -LiteralPath $changing
    Initialize-Structure $c $root
    Assert (Test-Path -LiteralPath (Join-Path $c.Destination ('Alpha\Invoices\12'+(Get-Date).Year))) 'All months for current year created'
    Assert (Test-Path -LiteralPath (Join-Path $c.Destination 'IT\Documents')) 'Requested category tree created'
    # Exclusion regression checks: routing, preview, movement, removal, and upgrade.
    $legacy=$c | ConvertTo-Json -Depth 12 | ConvertFrom-Json
    $legacy.PSObject.Properties.Remove('ExcludedFolders');Check-Config $legacy $root
    Assert ($null -ne $legacy.PSObject.Properties['ExcludedFolders'] -and @($legacy.ExcludedFolders).Count -eq 0) 'Legacy settings migrate without exclusions'
    $keep=Join-Path $root 'Alpha Archive Private'
    [void][IO.Directory]::CreateDirectory((Join-Path $keep 'Nested'))
    [IO.File]::WriteAllText((Join-Path $keep 'Nested\inside.txt'),'unchanged')
    $c.ExcludedFolders=@('alpha archive private')
    Assert (Is-Protected (Get-Item -LiteralPath $keep) $c $root) 'Exclusion is case-insensitive and precedes folder rules'
    Assert ((@(Get-Preview $c $root | Where-Object Name -eq 'Alpha Archive Private')).Count -eq 0) 'Excluded folder omitted from preview'
    $seen=@{};$null=Invoke-Sort $c $root $seen $log
    Assert (!$seen.ContainsKey($keep)) 'Excluded folder is never queued to move'
    Assert (([IO.File]::ReadAllText((Join-Path $keep 'Nested\inside.txt'))) -eq 'unchanged') 'Excluded nested contents preserved'
    $other=Join-Path $root 'Alpha Archive Private Extra';[void][IO.Directory]::CreateDirectory($other)
    Assert (!(Is-Protected (Get-Item -LiteralPath $other) $c $root)) 'Exclusions match exact names, not prefixes'
    $fakeFile=[pscustomobject]@{Name='Alpha Archive Private';PSIsContainer=$false;Extension='';Attributes=[IO.FileAttributes]::Normal;FullName=$keep;LinkType=$null}
    Assert (!(Is-Protected $fakeFile $c $root)) 'Folder exclusions do not exclude similarly named files'
    $c.ExcludedFolders=@()
    Assert ((@(Get-Preview $c $root | Where-Object Name -eq 'Alpha Archive Private')).Count -eq 1) 'Removing exclusion restores eligibility'
    foreach($invalid in @('..','Nested\Folder','Some*Folder')) {
        $bad=$c | ConvertTo-Json -Depth 12 | ConvertFrom-Json;$bad.ExcludedFolders=@($invalid)
        $rejected=$false;try{Check-Config $bad $root}catch{$rejected=$true};Assert $rejected "Invalid exclusion rejected: $invalid"
    }
    $c.ExcludedFolders=@('Alpha Archive Private')
    $settings=Join-Path $root 'test-settings.json';Save-Config $c $settings;Save-Config $c $settings
    Assert (Test-Path -LiteralPath ($settings+'.bak')) 'Atomic settings backup created'
    $roundtrip=Get-Content -LiteralPath $settings -Raw | ConvertFrom-Json
    Assert ($roundtrip.ExcludedFolders[0] -eq 'Alpha Archive Private') 'Exclusions persist across saving and loading'
    $generic=New-LogicFlowConfig $root;Check-Config $generic $root
    Assert ($generic.Groups.Count -eq 0 -and $generic.Rules.Count -eq 0) 'New users do not inherit organization-specific rules'
    Assert ($generic.Destination -eq (Join-Path $root 'Organized Files')) 'Generic organized destination'
    Assert ($generic.Unclassified -eq (Join-Path $root 'Unclassified Items')) 'Generic unclassified destination'
    Assert (!$generic.Enabled) 'New setup starts paused'
    Assert ((Get-Route (Fake 'report.pdf') $generic).Folder -eq (Join-Path $generic.Destination 'PDFs')) 'Generic extension routing without workspace names'
    Assert ((Get-Route (Fake 'notes.txt') $generic).Folder -eq (Join-Path $generic.Destination 'Documents')) 'Generic text document category'
    Assert ((Get-Route (Fake 'unrecognized.xyz') $generic).Folder -eq $generic.Unclassified) 'Generic unmatched file goes to review'
    Assert ((Get-Route (Fake 'My project' $true) $generic).Folder -eq $generic.Unclassified) 'Generic folder remains intact and goes to review'
    $grouped=New-LogicFlowConfig $root @('Finance','Project Atlas');Check-Config $grouped $root
    Assert (!$grouped.RootCategories) 'Grouped setup requires a workspace match by default'
    Assert ((Get-Route (Fake 'Finance report.xlsx') $grouped).Folder -eq (Join-Path $grouped.Destination 'Finance\Spreadsheets')) 'User-defined group routing'
    Assert ((Get-Route (Fake 'random.pdf') $grouped).Folder -eq $grouped.Unclassified) 'Unmatched workspace enters review'
    $grouped.RootCategories=$true
    Assert ((Get-Route (Fake 'random.pdf') $grouped).Folder -eq (Join-Path $grouped.Destination 'PDFs')) 'User-enabled root category fallback'
    Assert ((Get-Route (Fake 'Finance Project Atlas.pdf') $grouped).Folder -eq $grouped.Unclassified) 'Ambiguity beats generic fallback'
    $old=$c | ConvertTo-Json -Depth 12 | ConvertFrom-Json;$old.PSObject.Properties.Remove('RootCategories')
    Check-Config $old $root
    Assert (!$old.RootCategories -and $old.Destination -eq $c.Destination -and $old.ExcludedFolders[0] -eq 'Alpha Archive Private') 'Existing settings migrate without changing behavior'
    $generic.ExcludedFolders=@('Keep me')
    $imported=Import-RuleSet $generic (Export-RuleSet $grouped) $root
    Assert ($imported.RootCategories -and $imported.Groups.Count -eq 2) 'New rule exports preserve routing mode'
    Assert ($imported.ExcludedFolders[0] -eq 'Keep me' -and $imported.Destination -eq $generic.Destination) 'Imports preserve per-user paths and exclusions'
    $legacyExport=Export-RuleSet $c;$legacyExport.PSObject.Properties.Remove('RootCategories')
    $imported=Import-RuleSet $generic $legacyExport $root
    Assert (!$imported.RootCategories -and !$imported.Enabled) 'Old rule imports retain legacy mode and pause'
    Initialize-Structure $generic $root
    Assert (Test-Path -LiteralPath (Join-Path $generic.Destination 'Documents')) 'Generic structure can be created on start'
    $savedGeneric=Join-Path $root 'generic-settings.json';Save-Config $generic $savedGeneric
    $loadedGeneric=Get-Content -LiteralPath $savedGeneric -Raw | ConvertFrom-Json;Check-Config $loadedGeneric $root
    Assert ($loadedGeneric.RootCategories -and $loadedGeneric.ExcludedFolders[0] -eq 'Keep me') 'Generic setup roundtrips with exclusions'
    Assert ($generic.Protected.Count -eq 0 -and $generic.Rules.Count -eq 0) 'No bundled personal protections or filename rules'
    Assert ($generic.Extensions.Count -eq 5 -and 'ZPL' -notin $generic.Extensions.Folder) 'Only neutral file categories are prefilled'
    $independent=New-LogicFlowConfig $root
    $independent.Groups+= [pscustomobject]@{Folder='Research';Aliases='Research'}
    Assert ($generic.Groups.Count -eq 0) 'Configurations are independent between users'
    Write-Host "PASS: $script:passed checks" -ForegroundColor Green
} finally {if(Test-Path -LiteralPath $root){Remove-Item -LiteralPath $root -Recurse -Force}}

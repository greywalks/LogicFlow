# LogicFlow 3.0 | Author: Cisik
function Full-Path([string]$Path) {
    [IO.Path]::GetFullPath($Path).TrimEnd([IO.Path]::DirectorySeparatorChar, [IO.Path]::AltDirectorySeparatorChar)
}
function Is-Within([string]$Child,[string]$Parent) {
    $c=Full-Path $Child; $p=Full-Path $Parent
    ($c.Equals($p,[StringComparison]::OrdinalIgnoreCase) -or $c.StartsWith($p+[IO.Path]::DirectorySeparatorChar,[StringComparison]::OrdinalIgnoreCase))
}
function Check-Relative([string]$Value) {
    if ([string]::IsNullOrWhiteSpace($Value) -or [IO.Path]::IsPathRooted($Value)) { throw "Enter a folder name, such as Reports. Do not enter a full location: '$Value'." }
    foreach ($part in ($Value -split '[\\/]')) {
        if (!$part -or $part -in @('.','..') -or $part -match '[<>:"|?*\x00-\x1f]' -or $part -match '[. ]$' -or $part -match '^(?i:CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])(?:\.|$)') {
            throw "The folder name '$Value' cannot be used. Avoid special characters, trailing dots and names like CON."
        }
    }
}
function Split-Names([string]$Value) { @($Value.Split(';') | ForEach-Object {$_.Trim()} | Where-Object {$_}) }
function Has-Word([string]$Name,[string]$Words) {
    foreach ($word in (Split-Names $Words)) {
        # Whole tokens; avoids short aliases matching inside longer words.
        if ($Name -match ('(?i)(?<![\p{L}\p{N}])'+[regex]::Escape($word)+'(?![\p{L}\p{N}])')) {return $true}
    }
    return $false
}
function Check-Config($Config,[string]$WatchFolder) {
    if (![IO.Path]::IsPathRooted($WatchFolder) -or !(Test-Path -LiteralPath $WatchFolder -PathType Container)) {throw 'Choose an existing folder to organize.'}
    if ((Full-Path $WatchFolder) -eq (Full-Path ([IO.Path]::GetPathRoot($WatchFolder)))) {throw 'Choose a folder rather than an entire drive.'}
    Assert-NoLinks $WatchFolder

    if (!$Config.PSObject.Properties['RootCategories']) {$Config | Add-Member -NotePropertyName RootCategories -NotePropertyValue $false}
    if ($Config.RootCategories -isnot [bool]) {throw 'RootCategories must be true or false.'}
    if (!$Config.PSObject.Properties['ExcludedFolders']) {$Config | Add-Member -NotePropertyName ExcludedFolders -NotePropertyValue @()}
    foreach ($name in @($Config.ExcludedFolders)) {
        Check-Relative $name
        if ($name -match '[\\/]') {throw 'Use Choose a folder to select a folder to leave alone.'}
    }
    if ($Config.Version -ne 1) {throw 'Unsupported rules file version.'}
    foreach ($path in @($Config.Destination,$Config.Unclassified)) {
        if (![IO.Path]::IsPathRooted($path)) {throw 'Choose both output folders using Choose folder.'}
        if (Is-Within $WatchFolder $path) {throw 'A destination cannot be the watched folder or a parent of the watched folder.'}
        if ([IO.Path]::GetPathRoot((Full-Path $path)) -ine [IO.Path]::GetPathRoot((Full-Path $WatchFolder))) {throw 'Choose destinations on the same drive as your watched folder, so entire folders can move intact without scanning their contents.'}
        if (Test-Path -LiteralPath $path -PathType Leaf) {throw "Destination is a file: $path"}
        Assert-NoLinks $path
    }
    if ((Is-Within $Config.Destination $Config.Unclassified) -or (Is-Within $Config.Unclassified $Config.Destination)) {throw 'Organized and unclassified destinations must be separate folders, not inside each other.'}
    $seen=@{}
    foreach ($group in @($Config.Groups)) {
        Check-Relative $group.Folder
        if ($group.Folder -match '[\\/]') {throw 'Enter one folder name without slashes.'}
        if ($seen.ContainsKey($group.Folder)) {throw "Duplicate top-level folder: $($group.Folder)"}
        $seen[$group.Folder]=$true
        if (!(Split-Names $group.Aliases).Count) {throw "Add at least one alias for $($group.Folder)."}
    }
    foreach ($rule in @($Config.Rules)) {
        Check-Relative $rule.Subfolder
        if ($rule.Scope -ne '*' -and !$seen.ContainsKey($rule.Scope)) {throw "Unknown rule scope '$($rule.Scope)'. Use * or a top-level folder name."}
        if (!(Split-Names $rule.Words).Count) {throw 'Enter at least one word or phrase to look for.'}
        if ($rule.Kind -notin @('Files','Folders','Both')) {throw 'Rule kind must be Files, Folders, or Both.'}
        $n=0; if (![int]::TryParse([string]$rule.Priority,[ref]$n)) {throw 'Priority must be a whole number.'}
        if ($rule.Dated -isnot [bool]) {throw 'Choose whether this rule should add a month-and-year folder.'}
    }
    $exts=@{}
    foreach ($mapping in @($Config.Extensions)) {
        Check-Relative $mapping.Folder
        if (!(Split-Names $mapping.Extensions).Count) {throw 'Extension mappings cannot be empty.'}
        foreach ($ext in (Split-Names $mapping.Extensions)) {
            if ($ext -notmatch '^\.[a-zA-Z0-9]+$') {throw "Use extensions like .xlsx, separated with semicolons: '$ext'."}
            if ($exts.ContainsKey($ext)) {throw "Duplicate extension: $ext"}; $exts[$ext]=$true
        }
    }
}
function Assert-NoLinks([string]$Path) {
    # Checks destination ancestor metadata only; never enumerates its contents.
    $p=Full-Path $Path
    while ($p) {
        if (Test-Path -LiteralPath $p) {
            $entry=Get-Item -LiteralPath $p -Force -ErrorAction Stop
            if ($entry.LinkType -in @('SymbolicLink','Junction')) {throw "Linked destination is not allowed: $p"}
        }
        $parent=[IO.Directory]::GetParent($p)
        if (!$parent) {break}; $p=$parent.FullName
    }
}
function Get-Month([string]$Name) {
    $months=@()
    foreach ($m in [regex]::Matches($Name,'(?<!\d)(0[1-9]|1[0-2])((?:19|20|21)\d{2})(?!\d)')) {$months += $m.Groups[1].Value+$m.Groups[2].Value}
    foreach ($m in [regex]::Matches($Name,'(?<!\d)((?:19|20|21)\d{2})[-_](0[1-9]|1[0-2])(?!\d)')) {$months += $m.Groups[2].Value+$m.Groups[1].Value}
    foreach ($m in [regex]::Matches($Name,'(?<!\d)(0[1-9]|1[0-2])[-_]((?:19|20|21)\d{2})(?!\d)')) {$months += $m.Groups[1].Value+$m.Groups[2].Value}
    $months=@($months | Select-Object -Unique)
    if ($months.Count -eq 1) {return $months[0]}; return $null
}
function Get-Route($Item,$Config) {
    $name=if ($Item.PSIsContainer) {$Item.Name} else {[IO.Path]::GetFileNameWithoutExtension($Item.Name)}
    $hits=@($Config.Groups | Where-Object {Has-Word $name $_.Aliases})
    if ($hits.Count -gt 1) {return [pscustomobject]@{Folder=$Config.Unclassified;Reason='Ambiguous top-level name'}}
    $group=if ($hits.Count -eq 1) {$hits[0].Folder} else {''}
    $kind=if ($Item.PSIsContainer) {'Folders'} else {'Files'}
    foreach ($rule in @($Config.Rules | Sort-Object {[int]$_.Priority})) {
        if ($rule.Kind -notin @($kind,'Both') -or ($rule.Scope -ne '*' -and $rule.Scope -ine $group) -or !(Has-Word $name $rule.Words)) {continue}
        $base=if ($rule.Scope -eq '*') {$Config.Destination} else {Join-Path $Config.Destination $group}
        $dest=Join-Path $base $rule.Subfolder
        if ($rule.Dated) {
            $month=Get-Month $name
            if (!$month) {return [pscustomobject]@{Folder=$Config.Unclassified;Reason='Filename rule needs one valid month/year'}}
            $dest=Join-Path $dest $month
        }
        return [pscustomobject]@{Folder=$dest;Reason="Filename rule: $($rule.Words)"}
    }
    if (!$Item.PSIsContainer -and ($group -or $Config.RootCategories)) {
        foreach ($map in @($Config.Extensions)) {
            if ($Item.Extension -iin (Split-Names $map.Extensions)) {return [pscustomobject]@{Folder=(Join-Path $(if($group){Join-Path $Config.Destination $group}else{$Config.Destination}) $map.Folder);Reason="Extension $($Item.Extension)"}}
        }
    }
    [pscustomobject]@{Folder=$Config.Unclassified;Reason='No matching rule'}
}
function Is-Protected($Item,$Config,[string]$WatchFolder) {
    if ($Item.PSIsContainer -and $Item.Name -iin @($Config.ExcludedFolders)) {return $true}
    if ($Item.Name -in @('desktop.ini','LogicFlow','LogicFlow-Setup.exe')) {return $true}
    if ($Item.Extension -in @('.lnk','.url','.appref-ms')) {return $true}
    if (($Item.Attributes -band ([IO.FileAttributes]::Hidden -bor [IO.FileAttributes]::System -bor [IO.FileAttributes]::Offline)) -ne 0) {return $true}
    if ($Item.LinkType -in @('SymbolicLink','Junction')) {return $true}
    foreach ($path in @($Config.Destination,$Config.Unclassified)+@($Config.Protected)) {
        if ($path -and (Is-Within $path $Item.FullName)) {return $true}
    }
    return $false
}
function Get-Preview($Config,[string]$WatchFolder) {
    Check-Config $Config $WatchFolder
    # This is the only directory enumeration in the application. Never recurse.
    foreach ($item in @(Get-ChildItem -LiteralPath $WatchFolder -Force -ErrorAction Stop)) {
        if (Is-Protected $item $Config $WatchFolder) {continue}
        if ($item.Name -match '(^~\$|\.(crdownload|part|partial|tmp|download)$)') {continue}
        $route=Get-Route $item $Config
        [pscustomobject]@{Name=$item.Name;Type=$(if($item.PSIsContainer){'Folder (intact)'}else{'File'});Destination=(Join-Path $route.Folder $item.Name);Reason=$route.Reason;Item=$item;Folder=$route.Folder}
    }
}
function Unique-Destination([string]$Folder,[string]$Name,[bool]$Directory) {
    $stem=if($Directory){$Name}else{[IO.Path]::GetFileNameWithoutExtension($Name)}
    $ext=if($Directory){''}else{[IO.Path]::GetExtension($Name)}
    $p=Join-Path $Folder $Name; $n=1
    while (Test-Path -LiteralPath $p) {$p=Join-Path $Folder ("$stem ($n)$ext");$n++}
    $p
}
function Save-Config($Config,[string]$Path) {
    $tmp=$Path+'.tmp'
    $Config | ConvertTo-Json -Depth 12 | Set-Content -LiteralPath $tmp -Encoding UTF8
    if (Test-Path -LiteralPath $Path) {[IO.File]::Replace($tmp,$Path,$Path+'.bak')} else {[IO.File]::Move($tmp,$Path)}
}
function Write-History([string]$Log,[string]$Status,[string]$Source,[string]$Destination,[string]$Detail) {
    [pscustomobject]@{Time=(Get-Date).ToString('o');Status=$Status;Source=$Source;Destination=$Destination;Detail=$Detail} | ConvertTo-Json -Compress | Add-Content -LiteralPath $Log -Encoding UTF8 -ErrorAction Stop
}
function Invoke-Sort($Config,[string]$WatchFolder,[hashtable]$Observed,[string]$Log) {
    $rows=@(Get-Preview $Config $WatchFolder); $now=[datetime]::UtcNow; $present=@{}; $moved=0; $errors=0
    foreach ($row in $rows) {
        $item=$row.Item; $source=$item.FullName; $present[$source]=$true
        $fingerprint="$($item.LastWriteTimeUtc.Ticks):$($item.CreationTimeUtc.Ticks):$($item.Length)"
        if (!$Observed.ContainsKey($source) -or $Observed[$source].Fingerprint -ne $fingerprint) {
            $Observed[$source]=@{Fingerprint=$fingerprint;Since=$now}; continue
        }
        if (($now-$Observed[$source].Since).TotalSeconds -lt 30 -or ($now-$item.LastWriteTimeUtc).TotalSeconds -lt 30) {continue}
        $target=''
        try {
            if (!$item.PSIsContainer -and (Full-Path $item.DirectoryName) -ne (Full-Path $WatchFolder)) {throw 'Source is not directly on watched folder.'}
            if ($item.PSIsContainer -and (Full-Path $item.Parent.FullName) -ne (Full-Path $WatchFolder)) {throw 'Folder is not directly on watched folder.'}
            $fresh=Get-Item -LiteralPath $source -Force -ErrorAction Stop
            if (Is-Protected $fresh $Config $WatchFolder) {continue}
            if ($fresh.LastWriteTimeUtc.Ticks -ne $item.LastWriteTimeUtc.Ticks) {continue}
            if (!$item.PSIsContainer) {
                $stream=[IO.File]::Open($source,[IO.FileMode]::Open,[IO.FileAccess]::Read,[IO.FileShare]::None)
                $stream.Dispose()
            }
            Assert-NoLinks $row.Folder
            [void][IO.Directory]::CreateDirectory($row.Folder)
            Assert-NoLinks $row.Folder
            $target=Unique-Destination $row.Folder $item.Name $item.PSIsContainer
            # Log intent before moving, so a logging failure cannot produce an unrecorded move.
            Write-History $Log 'Pending' $source $target $row.Reason
            if ($item.PSIsContainer) {[IO.Directory]::Move($source,$target)} else {[IO.File]::Move($source,$target)}
            $moved++; $Observed.Remove($source)
            Write-History $Log 'Moved' $source $target $row.Reason
        } catch {
            $errors++
            Write-History $Log 'Error' $source $target $_.Exception.Message
        }
    }
    foreach ($key in @($Observed.Keys)) {if (!$present.ContainsKey($key)) {$Observed.Remove($key)}}
    [pscustomobject]@{Moved=$moved;Errors=$errors;Waiting=$Observed.Count}
}

function Initialize-Structure($Config,[string]$WatchFolder) {
    Check-Config $Config $WatchFolder
    $paths=@($Config.Destination,$Config.Unclassified)
    if($Config.RootCategories) {foreach($map in @($Config.Extensions)) {$paths+=,(Join-Path $Config.Destination $map.Folder)}}
    foreach($group in @($Config.Groups)) {
        $base=Join-Path $Config.Destination $group.Folder
        $paths+=,$base
        foreach($map in @($Config.Extensions)) {$paths+=,(Join-Path $base $map.Folder)}
    }
    foreach($rule in @($Config.Rules)) {
        $base=if($rule.Scope -eq '*'){$Config.Destination}else{Join-Path $Config.Destination $rule.Scope}
        $folder=Join-Path $base $rule.Subfolder;$paths+=,$folder
        if($rule.Dated) {foreach($month in 1..12){$paths+=,(Join-Path $folder ('{0:00}{1}' -f $month,(Get-Date).Year))}}
    }
    foreach($path in @($paths | Select-Object -Unique)) {Assert-NoLinks $path;[void][IO.Directory]::CreateDirectory($path)}
}

function New-LogicFlowConfig([string]$WatchFolder,[string[]]$GroupNames=@()) {
    [pscustomobject]@{
        Version=1; WatchFolder=$WatchFolder; Destination=(Join-Path $WatchFolder 'Organized Files'); Unclassified=(Join-Path $WatchFolder 'Unclassified Items'); Interval=30
        Enabled=$false; ExcludedFolders=@(); Protected=@(); Rules=@()
        Groups=@($GroupNames | ForEach-Object {[pscustomobject]@{Folder=$_;Aliases=$_}})
        RootCategories=($GroupNames.Count -eq 0)
        Extensions=@(
            [pscustomobject]@{Extensions='.doc;.docx;.docm;.dot;.dotx;.rtf;.odt;.txt;.md';Folder='Documents'},
            [pscustomobject]@{Extensions='.xlsx;.xls;.xlsm;.xlsb;.xltx;.xltm;.csv;.tsv;.ods';Folder='Spreadsheets'},
            [pscustomobject]@{Extensions='.pdf';Folder='PDFs'},
            [pscustomobject]@{Extensions='.png;.jpg;.jpeg;.gif;.bmp;.tif;.tiff;.webp;.svg;.heic;.ico';Folder='Images'},
            [pscustomobject]@{Extensions='.zip;.7z;.rar;.gz;.tar;.msi;.exe;.iso';Folder='Packages'}
        )
    }
}
function Export-RuleSet($Config) {
    [pscustomobject]@{Version=1;Groups=@($Config.Groups);Rules=@($Config.Rules);Extensions=@($Config.Extensions);RootCategories=[bool]$Config.RootCategories}
}
function Import-RuleSet($Config,$Import,[string]$WatchFolder) {
    if($Import.Version -ne 1) {throw 'Unsupported rules version.'}
    foreach($required in @('Groups','Rules','Extensions')) {if(!$Import.PSObject.Properties[$required]) {throw "Rules file is missing $required."}}
    $c=$Config | ConvertTo-Json -Depth 12 | ConvertFrom-Json
    $c.Groups=@($Import.Groups);$c.Rules=@($Import.Rules);$c.Extensions=@($Import.Extensions);$c.Enabled=$false
    # Old exports required a group match. Preserve that behavior on import.
    $c | Add-Member -NotePropertyName RootCategories -NotePropertyValue ([bool]$Import.RootCategories) -Force
    Check-Config $c $WatchFolder
    return $c
}

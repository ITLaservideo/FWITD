# Shared helpers of the BuildingProcess scripts, dot-sourced: `. (Join-Path $PSScriptRoot "_FWCommon.ps1")`
#
# Every path is resolved from this file's own location inside the FWITD submodule (BuildingProcess\scripts\..\..),
# never from the host project, so the scripts behave the same in every project that includes FWITD.
#
# Mirrors UiBuilder: Lib\FWPaths.cs, Lib\UpdaterEnums.cs, Helpers\addFWJSComponent.cs - keep them in sync.
# Windows PowerShell 5.1 compatible; keep this file ASCII-only (5.1 reads BOM-less scripts as ANSI).

$ErrorActionPreference = 'Stop'

$FWITDRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
$FWClientApp = Join-Path $FWITDRoot "ClientApp"
$FW = [pscustomobject]@{
    Root                 = $FWITDRoot
    ClientApp            = $FWClientApp
    StandalonePages      = Join-Path $FWClientApp "apps_standalone"
    StandaloneComponents = Join-Path $FWClientApp "apps_standalone_components"
    Injectables          = Join-Path $FWClientApp "apps_injectable"
    GlobalComponents     = Join-Path $FWClientApp "components"
    Utils                = Join-Path $FWClientApp "utils"
    Frameworks           = Join-Path $FWClientApp "utils\frameworks"
    ExternalLibs         = Join-Path $FWClientApp "utils\external_libs"
    Templates            = Join-Path $FWITDRoot "BuildingProcess\data"
    EnumsFile            = Join-Path $FWITDRoot "JSProvider.cs"
    AppConfigFile        = Join-Path $FWITDRoot "AppConfig.cs"
}
$FWNamePattern = '^[a-zA-Z][a-zA-Z0-9_]*$'

#region console
function Write-FWOk([string]$Message) { Write-Host $Message -ForegroundColor Green }
function Write-FWWarn([string]$Message) { Write-Host $Message -ForegroundColor Yellow }
function Write-FWErr([string]$Message) { Write-Host $Message -ForegroundColor Red }

<#
 runs $Body with a title, reports a thrown error instead of a stack trace, waits for ENTER unless -NoPause
 (double-clicked .bat files need the pause, VS Code tasks don't) and exits with 0 / 1
#>
function Invoke-FWMain([string]$Title, [bool]$NoPause, [scriptblock]$Body) {
    Write-Host ""
    Write-Host "=== $Title ===" -ForegroundColor Cyan
    Write-Host "FWITD: $($FW.Root)" -ForegroundColor DarkGray
    $code = 0
    try {
        & $Body | Out-Null
    } catch {
        Write-FWErr "ERROR: $($_.Exception.Message)"
        $code = 1
    }
    Write-Host ""
    if (-not $NoPause) { Read-Host "Press ENTER to exit" | Out-Null }
    exit $code
}

<#
 asks for a name until it is a valid identifier and $Validate (returns an error message or $null) accepts it;
 a name passed as script parameter is not asked, it throws when invalid
#>
function Read-FWName([string]$Prompt, [string]$Preset, [scriptblock]$Validate) {
    while ($true) {
        $name = if ($Preset) { $Preset.Trim() } else { (Read-Host $Prompt).Trim() }
        $err = $null
        if ([string]::IsNullOrWhiteSpace($name)) {
            $err = "Name cannot be empty."
        } elseif ($name -notmatch $FWNamePattern) {
            $err = "Invalid name '$name'. Must start with a letter and contain only letters, numbers, and underscores."
        } elseif ($Validate) {
            $err = & $Validate $name
        }
        if (-not $err) { return $name }
        if ($Preset) { throw $err }
        Write-FWErr $err
    }
}

<#
 only the answer opposite to $Default changes it, anything else (ENTER included) keeps it:
   $Default = $true  -> opt-out: only `n` / `no` answers $false
   $Default = $false -> opt-in:  only `y` / `yes` answers $true
#>
function Read-FWYesNo([string]$Question, [bool]$Default) {
    $hint = if ($Default) { "(Y/n)" } else { "(y/N)" }
    $answer = (Read-Host "$Question $hint").Trim()
    if ($Default) { return -not ($answer -match '^(n|no)$') }
    return $answer -match '^(y|yes)$'
}

function Assert-FWFiles([string[]]$Paths) {
    $missing = @($Paths | Where-Object { -not (Test-Path -LiteralPath $_ -PathType Leaf) })
    if ($missing.Count -gt 0) {
        throw "Missing file(s):`n - $($missing -join "`n - ")"
    }
}
#endregion

#region files
<# reads a text file remembering its BOM and line endings, so saving it back doesn't change either #>
function Read-FWTextFile([string]$Path) {
    $bytes = [System.IO.File]::ReadAllBytes($Path)
    $bom = $bytes.Length -ge 3 -and $bytes[0] -eq 0xEF -and $bytes[1] -eq 0xBB -and $bytes[2] -eq 0xBF
    $text = [System.IO.File]::ReadAllText($Path)
    $nl = if ($text.Contains("`r`n")) { "`r`n" } else { "`n" }
    return [pscustomobject]@{ Path = $Path; Text = $text; Original = $text; Bom = $bom; NL = $nl }
}

<# writes back a file of Read-FWTextFile; returns whether anything changed #>
function Save-FWTextFile($File) {
    if ($File.Text -ceq $File.Original) { return $false }
    [System.IO.File]::WriteAllText($File.Path, $File.Text, (New-Object System.Text.UTF8Encoding($File.Bom)))
    $File.Original = $File.Text
    return $true
}

<# UTF-8 without BOM, like File.WriteAllText in UiBuilder #>
function Write-FWNewFile([string]$Path, [string]$Content) {
    [System.IO.File]::WriteAllText($Path, $Content, (New-Object System.Text.UTF8Encoding($false)))
}

<# replaces the first match of $Pattern in $File.Text with $Replacement #>
function Set-FWBlock($File, [string]$Pattern, [string]$Replacement, [string]$What) {
    $m = [regex]::Match($File.Text, $Pattern)
    if (-not $m.Success) {
        Write-FWErr "  ! $What not found in $(Split-Path -Leaf $File.Path)"
        return
    }
    if ($m.Value -ceq $Replacement) {
        Write-Host "  - $What unchanged" -ForegroundColor DarkGray
        return
    }
    $File.Text = $File.Text.Substring(0, $m.Index) + $Replacement + $File.Text.Substring($m.Index + $m.Length)
    Write-FWOk "  - $What updated"
}
#endregion

#region names
function ConvertTo-FWSortedArray([string[]]$Names) {
    $arr = [string[]]@($Names | Where-Object { $_ })
    [System.Array]::Sort($arr, [System.StringComparer]::OrdinalIgnoreCase)
    return , $arr
}

<# keeps only the names usable as C# enum members #>
function Select-FWValidNames([string[]]$Names, [string]$Where) {
    $ok = New-Object 'System.Collections.Generic.List[string]'
    foreach ($n in @($Names | Where-Object { $_ })) {
        if ($n -match $FWNamePattern) {
            $ok.Add($n)
        } else {
            Write-FWWarn "  ! skipped '$n' in $Where (not a valid C# identifier)"
        }
    }
    return , $ok.ToArray()
}

<# sorted sub-folder names of $Path; empty when $Path doesn't exist #>
function Get-FWFolderNames([string]$Path, [string]$Where) {
    if (-not (Test-Path -LiteralPath $Path -PathType Container)) { return , [string[]]@() }
    $names = @(Get-ChildItem -LiteralPath $Path -Directory -Force | ForEach-Object { $_.Name })
    return , (ConvertTo-FWSortedArray (Select-FWValidNames $names $Where))
}

<# sorted names of the `*.js` (not `*.min.js`) files of $Path #>
function Get-FWJsNames([string]$Path, [string]$Where) {
    if (-not (Test-Path -LiteralPath $Path -PathType Container)) { return , [string[]]@() }
    $names = @(Get-ChildItem -LiteralPath $Path -Filter "*.js" -File -Force |
        Where-Object { $_.Extension -eq ".js" -and $_.Name -notlike "*.min.js" } |
        ForEach-Object { $_.BaseName })
    return , (ConvertTo-FWSortedArray (Select-FWValidNames $names $Where))
}

<# `components/` sub-folders of every folder in $Root, as an ordered name -> children map #>
function Get-FWChildComponents([string]$Root, [string[]]$Parents, [string]$RootLabel) {
    $map = [ordered]@{}
    foreach ($parent in $Parents) {
        $map[$parent] = Get-FWFolderNames (Join-Path (Join-Path $Root $parent) "components") "$RootLabel\$parent\components"
    }
    return $map
}
#endregion

#region JSProvider.cs enums (UiBuilder: UpdaterEnums.updateAll)
function Set-FWEnum($File, [string]$EnumName, [string[]]$Values) {
    $body = if ($Values.Count -gt 0) { " $($Values -join ', ') " } else { " " }
    Set-FWBlock $File "internal\s+enum\s+$EnumName\s*\{[^}]*\}" "internal enum $EnumName {$body}" "enum '$EnumName'"
}

function Format-FWDictionary([string]$Declaration, [string[]]$Entries, [string]$NL) {
    $sb = New-Object System.Text.StringBuilder
    [void]$sb.Append("$Declaration {")
    foreach ($e in $Entries) { [void]$sb.Append("$NL                $e") }
    [void]$sb.Append("$NL            };")
    return $sb.ToString()
}

<# file name -> enum member: `pdf-lib` -> `pdf_lib` #>
function ConvertTo-FWIdentifier([string]$Name) {
    $id = [regex]::Replace($Name, '[^A-Za-z0-9_]', '_')
    if ($id -match '^[0-9]') { $id = "_$id" }
    return $id
}

<#
 keeps `enum external_libs` / `external_libs_info` in sync with the `*.js` files of utils\external_libs (the files
 listed in `external_libs_inlined`, e.g. pdf.worker, aren't libraries of their own). Unlike the other enums it is
 not regenerated: the enum order is the load order and the triggers can't be derived from the files, so
   - an existing lib keeps its position and its external_libs_info entry (triggers / requires)
   - a new file is appended, with the trigger `//keep <Name>` only: add the global(s) it exposes by hand
   - a lib whose file is gone is removed, together with its external_libs_info entry (and the comments above it)
#>
function Update-FWExternalLibs($File) {
    if (-not (Test-Path -LiteralPath $FW.ExternalLibs -PathType Container)) {
        Write-FWWarn "  ! utils\external_libs not found, enum 'external_libs' left as is"
        return
    }
    $nl = $File.NL
    $enum = [regex]::Match($File.Text, 'internal\s+enum\s+external_libs\s*\{([^}]*)\}')
    $info = [regex]::Match($File.Text, '(?m)external_libs_info\s*=\s*new\(\)\s*\{[^\n]*\n([\s\S]*?)^([ \t]*)\};')
    if (-not $enum.Success -or -not $info.Success) {
        Write-FWErr "  ! 'enum external_libs' / 'external_libs_info' not found in $(Split-Path -Leaf $File.Path)"
        return
    }

    # files inlined into another lib
    $inlined = New-Object 'System.Collections.Generic.HashSet[string]' ([System.StringComparer]::OrdinalIgnoreCase)
    $inlinedBlock = [regex]::Match($File.Text, '(?m)external_libs_inlined\s*=\s*new\(\)\s*\{[^\n]*\n([\s\S]*?)^[ \t]*\};')
    if ($inlinedBlock.Success) {
        foreach ($m in [regex]::Matches($inlinedBlock.Groups[1].Value, '\(\s*"[^"]*"\s*,\s*"([^"]+)"\s*\)')) { [void]$inlined.Add($m.Groups[1].Value) }
    }

    $files = @(Get-ChildItem -LiteralPath $FW.ExternalLibs -Filter "*.js" -File -Force |
        Where-Object { $_.Extension -eq ".js" -and $_.Name -notlike "*.min.js" -and -not $inlined.Contains($_.BaseName) } |
        ForEach-Object { $_.BaseName })
    $files = ConvertTo-FWSortedArray $files
    $fileSet = New-Object 'System.Collections.Generic.HashSet[string]' ([System.StringComparer]::OrdinalIgnoreCase)
    foreach ($f in $files) { [void]$fileSet.Add($f) }

    # enum member -> file_name of external_libs_info
    $infoFiles = @{}
    foreach ($m in [regex]::Matches($info.Groups[1].Value, '\{\s*external_libs\.(\w+)\s*,\s*\(\s*"([^"]*)"')) { $infoFiles[$m.Groups[1].Value] = $m.Groups[2].Value }
    $members = @($enum.Groups[1].Value -split ',' | ForEach-Object { $_.Trim() } | Where-Object { $_ })

    $result = New-Object 'System.Collections.Generic.List[string]'
    $used = New-Object 'System.Collections.Generic.HashSet[string]' ([System.StringComparer]::OrdinalIgnoreCase)
    $removed = New-Object 'System.Collections.Generic.List[string]'
    $added = New-Object 'System.Collections.Generic.List[object]'
    foreach ($m in $members) {
        $f = if ($infoFiles.ContainsKey($m)) { $infoFiles[$m] } else { $files | Where-Object { (ConvertTo-FWIdentifier $_) -ceq $m } | Select-Object -First 1 }
        if ($f -and $fileSet.Contains($f)) {
            $result.Add($m)
            [void]$used.Add($f)
            if (-not $infoFiles.ContainsKey($m)) { $added.Add(@($m, $f)) }
        } else {
            $removed.Add($m)
        }
    }
    foreach ($f in $files) {
        if ($used.Contains($f)) { continue }
        $id = ConvertTo-FWIdentifier $f
        if ($result.Contains($id)) {
            Write-FWWarn "  ! external lib '$f' skipped: its enum name '$id' is already taken"
            continue
        }
        $result.Add($id)
        $added.Add(@($id, $f))
    }

    # external_libs_info: drop the removed libs, append the new ones
    $body = $info.Groups[1].Value
    foreach ($m in $removed) {
        $body = [regex]::Replace($body, "(?m)(?:^[ \t]*//[^\n]*\n)*^[ \t]*\{\s*external_libs\.$([regex]::Escape($m))\s*,[^\n]*\n", "")
        Write-FWWarn "  ! external lib '$m' removed: its file is gone from utils\external_libs"
    }
    $indent = $info.Groups[2].Value + "    "
    foreach ($a in $added) {
        $body += "$indent{ external_libs.$($a[0]), (`"$($a[1])`", [`"//keep $($a[0])`"], []) },$nl"
        Write-FWWarn "  ! external lib '$($a[0])' added with the trigger '//keep $($a[0])' only: add the global(s) it exposes to its triggers in external_libs_info"
    }
    $group = $info.Groups[1]
    if ($body -cne $group.Value) {
        $File.Text = $File.Text.Substring(0, $group.Index) + $body + $File.Text.Substring($group.Index + $group.Length)
        Write-FWOk "  - dictionary 'external_libs_info' updated"
    } else {
        Write-Host "  - dictionary 'external_libs_info' unchanged" -ForegroundColor DarkGray
    }
    Set-FWEnum $File "external_libs" $result.ToArray()

    foreach ($m in $removed) {
        if ($File.Text -match "external_libs\.$([regex]::Escape($m))\b") {
            Write-FWErr "  ! external_libs.$m is still referenced in $(Split-Path -Leaf $File.Path) (requires / external_libs_inlined): fix it by hand"
        }
    }
}

<#
 regenerates, in JSProvider.cs, the enums pages / utils / components / frameworks / injectable_apps and the
 dictionaries page_to_components / components_views from the folders of ClientApp, and keeps external_libs /
 external_libs_info in sync with utils\external_libs; returns whether the file changed
#>
function Update-FWJSEnums {
    Write-Host ""
    Write-Host "Updating JS enums in '$($FW.EnumsFile)'" -ForegroundColor Cyan
    Assert-FWFiles @($FW.EnumsFile)
    if (-not (Test-Path -LiteralPath $FW.ClientApp -PathType Container)) { throw "ClientApp folder not found: $($FW.ClientApp)" }
    $file = Read-FWTextFile $FW.EnumsFile

    $hasPages = Test-Path -LiteralPath $FW.StandalonePages -PathType Container
    $hasViews = Test-Path -LiteralPath $FW.StandaloneComponents -PathType Container
    $pages = Get-FWFolderNames $FW.StandalonePages "apps_standalone"
    $views = Get-FWFolderNames $FW.StandaloneComponents "apps_standalone_components"
    $pageChildren = Get-FWChildComponents $FW.StandalonePages $pages "apps_standalone"
    $viewChildren = Get-FWChildComponents $FW.StandaloneComponents $views "apps_standalone_components"

    # pages
    if ($hasPages) {
        Set-FWEnum $file "pages" $pages
    } else {
        Write-FWWarn "  ! apps_standalone not found, enum 'pages' left as is"
    }

    # utils / frameworks
    foreach ($e in @(@{ Name = "utils"; Path = $FW.Utils; Label = "utils" }, @{ Name = "frameworks"; Path = $FW.Frameworks; Label = "utils\frameworks" })) {
        if (Test-Path -LiteralPath $e.Path -PathType Container) {
            Set-FWEnum $file $e.Name (Get-FWJsNames $e.Path $e.Label)
        } else {
            Write-FWWarn "  ! $($e.Label) not found, enum '$($e.Name)' left as is"
        }
    }

    # external_libs (+ external_libs_info)
    Update-FWExternalLibs $file

    # components: global + ComponentViews + children of every page and ComponentView
    $all = New-Object 'System.Collections.Generic.List[object]'
    foreach ($c in (Get-FWFolderNames $FW.GlobalComponents "components")) { $all.Add(@($c, "components")) }
    foreach ($c in $views) { $all.Add(@($c, "apps_standalone_components")) }
    foreach ($p in $pageChildren.Keys) { foreach ($c in $pageChildren[$p]) { $all.Add(@($c, "apps_standalone\$p\components")) } }
    foreach ($v in $viewChildren.Keys) { foreach ($c in $viewChildren[$v]) { $all.Add(@($c, "apps_standalone_components\$v\components")) } }
    $seen = @{}
    foreach ($pair in $all) {
        $key = $pair[0].ToLowerInvariant()
        if ($seen.ContainsKey($key)) {
            Write-FWWarn "  ! component '$($pair[0])' exists both in $($seen[$key]) and $($pair[1]): listed once, only one of them can be loaded - rename one"
        } else {
            $seen[$key] = $pair[1]
        }
    }
    $components = ConvertTo-FWSortedArray @($all | ForEach-Object { $_[0] } | Sort-Object -Unique)
    Set-FWEnum $file "components" $components

    # injectable_apps
    if (Test-Path -LiteralPath $FW.Injectables -PathType Container) {
        Set-FWEnum $file "injectable_apps" (Get-FWFolderNames $FW.Injectables "apps_injectable")
    } else {
        Write-FWWarn "  ! apps_injectable not found, enum 'injectable_apps' left as is"
    }

    # page_to_components: only the pages with child components
    if ($hasPages) {
        $entries = @(foreach ($p in $pageChildren.Keys) {
                $children = $pageChildren[$p]
                if ($children.Count -gt 0) {
                    "{ pages.$p, new components[] { $(($children | ForEach-Object { "components.$_" }) -join ', ') } },"
                }
            })
        Set-FWBlock $file `
            'internal\s+static\s+readonly\s+Dictionary<pages,\s*components\[\]>\s+page_to_components\s*=\s*new\s+Dictionary<pages,\s*components\[\]>\(\)\s*\{[^;]*;' `
            (Format-FWDictionary "internal static readonly Dictionary<pages, components[]> page_to_components = new Dictionary<pages, components[]>()" $entries $file.NL) `
            "dictionary 'page_to_components'"
    }

    # components_views: every ComponentView, Array.Empty when it has no child components
    if ($hasViews) {
        $entries = @(foreach ($v in $viewChildren.Keys) {
                $children = $viewChildren[$v]
                if ($children.Count -gt 0) {
                    "{ components.$v, new components[] { $(($children | ForEach-Object { "components.$_" }) -join ', ') } },"
                } else {
                    "{ components.$v, Array.Empty<components>() },"
                }
            })
        Set-FWBlock $file `
            'internal\s+static\s+readonly\s+Dictionary<components,\s*components\[\]>\s+components_views\s*=\s*new\s+Dictionary<components,\s*components\[\]>\(\)\s*\{[^;]*;' `
            (Format-FWDictionary "internal static readonly Dictionary<components, components[]> components_views = new Dictionary<components, components[]>()" $entries $file.NL) `
            "dictionary 'components_views'"
    } else {
        Write-FWWarn "  ! apps_standalone_components not found, dictionary 'components_views' left as is"
    }

    if (Save-FWTextFile $file) {
        Write-FWOk "JSProvider.cs saved."
        return $true
    }
    Write-Host "JSProvider.cs already up to date." -ForegroundColor DarkGray
    return $false
}
#endregion

#region AppConfig.cs (UiBuilder: UpdaterEnums.UpdateAppConfigStartApp)
<# position of the start of the line holding $Index when only whitespace precedes it there, else $Index #>
function Get-FWLineStartIfBlank([string]$Text, [int]$Index) {
    $lineStart = $Text.LastIndexOf([char]10, [Math]::Max($Index - 1, 0)) + 1
    if ($Text.Substring($lineStart, $Index - $lineStart).Trim() -eq "") { return $lineStart }
    return $Index
}

<# adds `StartApp.<Page> = <max + 1>` and its `_scripts` entry (a standalone page, no url) #>
function Update-FWAppConfigStartApp([string]$PageName) {
    Write-Host ""
    Write-Host "Registering StartApp.$PageName in '$($FW.AppConfigFile)'" -ForegroundColor Cyan
    if (-not (Test-Path -LiteralPath $FW.AppConfigFile -PathType Leaf)) {
        Write-FWErr "  ! AppConfig.cs not found, add StartApp.$PageName and its _scripts entry by hand"
        return
    }
    $file = Read-FWTextFile $FW.AppConfigFile
    $nl = $file.NL
    $escaped = [regex]::Escape($PageName)

    # 1. enum StartApp
    $enum = [regex]::Match($file.Text, 'public\s+enum\s+StartApp\s*\{([\s\S]*?)\}')
    if (-not $enum.Success) {
        Write-FWErr "  ! 'enum StartApp' not found in AppConfig.cs"
        return
    }
    if ($enum.Groups[1].Value -match "\b$escaped\b") {
        Write-Host "  - StartApp.$PageName already exists" -ForegroundColor DarkGray
    } else {
        $values = @([regex]::Matches($enum.Groups[1].Value, '=\s*(-?\d+)') | ForEach-Object { [int]$_.Groups[1].Value })
        $next = if ($values.Count -gt 0) { ($values | Measure-Object -Maximum).Maximum + 1 } else { 0 }
        $indentMatch = [regex]::Match($enum.Groups[1].Value, '\n([ \t]+)\S')
        $indent = if ($indentMatch.Success) { $indentMatch.Groups[1].Value } else { "        " }
        $closing = $enum.Index + $enum.Length - 1
        $at = Get-FWLineStartIfBlank $file.Text $closing
        $line = if ($at -eq $closing) { "$nl$indent$PageName = $next,$nl" } else { "$indent$PageName = $next,$nl" }
        $file.Text = $file.Text.Insert($at, $line)
        Write-FWOk "  - added StartApp.$PageName = $next"
    }

    # 2. _scripts dictionary
    $dict = [regex]::Match($file.Text, '_scripts\s*=\s*new\(\)\s*\{([\s\S]*?)\}\s*;')
    if (-not $dict.Success) {
        Write-FWErr "  ! '_scripts' dictionary not found in AppConfig.cs"
    } elseif ($dict.Groups[1].Value -match "StartApp\.$escaped\]") {
        Write-Host "  - _scripts[StartApp.$PageName] already exists" -ForegroundColor DarkGray
    } else {
        $closing = $dict.Index + $dict.Value.LastIndexOf('}')
        $at = Get-FWLineStartIfBlank $file.Text $closing
        $key = ("[StartApp.$PageName]").PadRight(35)
        $entry = "            $key = ( main: (JSProvider.JS.pages.$PageName, null),$nl" +
                 "                                                  extra: (null, null)),$nl"
        if ($at -eq $closing) { $entry = $nl + $entry }
        $file.Text = $file.Text.Insert($at, $entry)
        Write-FWOk "  - added _scripts[StartApp.$PageName]"
    }

    if (Save-FWTextFile $file) { Write-FWOk "AppConfig.cs saved." }
}
#endregion

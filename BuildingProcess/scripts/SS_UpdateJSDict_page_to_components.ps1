Write-Host ""
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

# Target C# file
[string]$TargetSourceFile = Join-Path $ScriptDir "..\..\Utils\UtilsUi.cs"
$TargetSourceFile = (Resolve-Path $TargetSourceFile).Path

# Pages root
[string]$PagesRoot = Join-Path $ScriptDir "..\..\Resources\Raw\ui\App\pages"
$PagesRoot = (Resolve-Path $PagesRoot).Path

Write-Host "- Updating page_to_components in: '$TargetSourceFile'"
Write-Host "- Reading pages from: '..\..\Resources\Raw\ui\App\pages'"

# Collect dictionary entries
$dictEntries = @()

$pageFolders = Get-ChildItem -Path $PagesRoot -Directory

foreach ($page in $pageFolders) {

    $pageName = $page.Name   # folder name = enum name

    $componentsPath = Join-Path $page.FullName "components"

    if (Test-Path $componentsPath) {

        $componentFolders = Get-ChildItem -Path $componentsPath -Directory |
                            Select-Object -ExpandProperty Name |
                            Sort-Object

        if ($componentFolders.Count -gt 0) {

            # Convert folder names → components enum entries
            $componentEnumList = ($componentFolders | ForEach-Object { "components.$_" }) -join ", "

            # Correct C# syntax
            $entry = "                { pages.$pageName, new components[] { $componentEnumList } },"
            $dictEntries += $entry
        }
    }
}

if ($dictEntries.Count -eq 0) {
    Write-Host "- No components found for any page. Nothing to update."
    exit 0
}

# Build final dictionary block
$dictBody = $dictEntries -join "`n"

$replacement = @"
internal static readonly Dictionary<pages, components[]> page_to_components = new Dictionary<pages, components[]>() {
$dictBody
            };
"@

# Read file
$content = Get-Content $TargetSourceFile -Raw

# Regex to replace the whole dictionary block (corrected)

$pattern = 'internal\s+static\s+readonly\s+Dictionary<pages,\s*components\[\]>\s+page_to_components\s*=\s*new\s+Dictionary<pages,\s*components\[\]>\(\)\s*\{[^;]*;'


# Perform replacement
$newContent = [regex]::Replace($content, $pattern, $replacement)

# Check if replacement occurred
if ($newContent -ne $content) {
    Set-Content -Path $TargetSourceFile -Value $newContent -Encoding UTF8
    Write-Host "- Dictionary updated successfully:"
    Write-Host $replacement -ForegroundColor Green
}
else {
    Write-Host "Nothing was replaced." -ForegroundColor Gray
}

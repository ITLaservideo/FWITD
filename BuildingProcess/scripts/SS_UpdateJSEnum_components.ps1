# Hard‑coded paths relative to the script location
Write-Host ""
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

# Update these two variables as needed
[string]$TargetSourceFile   = Join-Path $ScriptDir "..\..\Utils\UtilsUi.cs"
[string]$ListOfDirectories  = Join-Path $ScriptDir "..\..\Resources\Raw\ui\App\components"

# Normalize paths
$TargetSourceFile  = (Resolve-Path $TargetSourceFile).Path
$ListOfDirectories = (Resolve-Path $ListOfDirectories).Path

Write-Host "- Updating enum in: '$TargetSourceFile'"
Write-Host "- Reading folders from: '..\..\Resources\Raw\ui\App\components'"

# 1. Get all page folders
[string]$PagesRoot = Join-Path $ScriptDir "..\..\Resources\Raw\ui\App\pages"
[string]$PagesRoot = (Resolve-Path $PagesRoot).Path

$pageFolders = Get-ChildItem -Path $PagesRoot -Directory
# Get folder names
$folders = Get-ChildItem -Path $ListOfDirectories -Directory | Select-Object -ExpandProperty Name


foreach ($page in $pageFolders) { # 2. Collect component folders inside each page
    $componentsPath = Join-Path $page.FullName "components"

    if (Test-Path $componentsPath) {
        $componentFolders = Get-ChildItem -Path $componentsPath -Directory |
                            Select-Object -ExpandProperty Name

        $folders += $componentFolders
    }
}

if ($folders.Count -eq 0) {
    Write-Host "- No folders found. Nothing to update."
    exit 0
}

# Sort alphabetically
$folders = $folders | Sort-Object

# Join into comma-separated enum values
$enumValues = $folders -join ", "

# Read file
$content = Get-Content $TargetSourceFile -Raw

# Replace enum block
$pattern = 'internal\s+enum\s+components\s*\{[^}]*\}'
$replacement = "internal enum components { $enumValues }"

$newContent = [regex]::Replace($content, $pattern, $replacement)

# Write back
Set-Content -Path $TargetSourceFile -Value $newContent -Encoding UTF8

Write-Host "- Enum updated successfully:"
Write-Host "to: '$replacement'" -ForegroundColor Green

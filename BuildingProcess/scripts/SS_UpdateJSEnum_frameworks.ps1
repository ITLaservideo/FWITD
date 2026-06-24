# Hard‑coded paths relative to the script location
Write-Host ""
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

# Update these two variables as needed
[string]$TargetSourceFile   = Join-Path $ScriptDir "..\..\Utils\UtilsUi.cs"
[string]$ListOfDirectories  = Join-Path $ScriptDir "..\..\Resources\Raw\ui\App\utils\frameworks"

# Normalize paths
$TargetSourceFile  = (Resolve-Path $TargetSourceFile).Path
$ListOfDirectories = (Resolve-Path $ListOfDirectories).Path

Write-Host "- Updating enum in: '$TargetSourceFile'"
Write-Host "- Reading JS files from: '..\..\Resources\Raw\ui\App\utils\frameworks'"

# 1. Get js files that do NOT end with .min.js
$jsFiles = Get-ChildItem -Path $ListOfDirectories -Filter "*.js" -File |
           Where-Object { $_.Name -notlike "*.min.js" }

# Extract filenames without extension
$filenamesWithoutExtensions = $jsFiles.BaseName

# Sort alphabetically
$filenamesWithoutExtensions = $filenamesWithoutExtensions | Sort-Object

# Join into comma-separated enum values
$enumValues = $filenamesWithoutExtensions -join ", "

# 2. Read file
$content = Get-Content $TargetSourceFile -Raw

# 3. Replace enum block
$pattern = 'internal\s+enum\s+frameworks\s*\{[^}]*\}'
$replacement = "internal enum frameworks { $enumValues }"

$newContent = [regex]::Replace($content, $pattern, $replacement)

# 4. Write back
Set-Content -Path $TargetSourceFile -Value $newContent -Encoding UTF8

Write-Host "- Enum updated successfully:"
Write-Host "to: '$replacement'" -ForegroundColor Green

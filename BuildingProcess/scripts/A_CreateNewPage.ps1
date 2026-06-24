# ================================
# Page Creator v1
# ================================

Write-Host ""
Write-Host "=== Page Creator ===" -ForegroundColor Cyan

# Script root
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

# Pages root
$PagesRoot = Join-Path $ScriptDir "..\..\Resources\Raw\ui\App\pages"
$PagesRoot = (Resolve-Path $PagesRoot).Path

# Template files
$TemplateCss = Join-Path $ScriptDir "..\data\test_page.css"
$TemplateHtml = Join-Path $ScriptDir "..\data\test_page.html"
$TemplateJs = Join-Path $ScriptDir "..\data\test_page.js"

# Validate template files
$missing = @()

if (!(Test-Path $TemplateCss))  { $missing += $TemplateCss }
if (!(Test-Path $TemplateHtml)) { $missing += $TemplateHtml }
if (!(Test-Path $TemplateJs))   { $missing += $TemplateJs }

if ($missing.Count -gt 0) {
    Write-Host "ERROR: Missing template files:" -ForegroundColor Red
    $missing | ForEach-Object { Write-Host " - $_" -ForegroundColor Red }
    Read-Host "Press ENTER to exit"
    exit
}

# ================================
# Ask for page name
# ================================

while ($true) {
    $pageName = Read-Host "Insert new page name"

    if ([string]::IsNullOrWhiteSpace($pageName)) {
        Write-Host "Name cannot be empty." -ForegroundColor Red
        continue
    }

    if ($pageName -notmatch '^[a-zA-Z][a-zA-Z0-9_]*$') {
        Write-Host "Invalid name. Must start with a letter and contain only letters, numbers, and underscores." -ForegroundColor Red
        continue
    }

    break
}

# Target folder
$TargetPageFolder = Join-Path $PagesRoot $pageName
$TargetComponentsFolder = Join-Path $TargetPageFolder "components"

# ================================
# Create page folder
# ================================

if (Test-Path $TargetPageFolder) {
    Write-Host "Page already exists: $pageName" -ForegroundColor Yellow
    Read-Host "Press ENTER to exit"
    exit
}

New-Item -ItemType Directory -Path $TargetPageFolder | Out-Null
New-Item -ItemType Directory -Path $TargetComponentsFolder | Out-Null

# ================================
# Create files
# ================================

$cssPath  = Join-Path $TargetPageFolder "$pageName.css"
$htmlPath = Join-Path $TargetPageFolder "$pageName.html"
$jsPath   = Join-Path $TargetPageFolder "$pageName.js"

Copy-Item $TemplateCss  $cssPath
Copy-Item $TemplateHtml $htmlPath
Copy-Item $TemplateJs   $jsPath

# Optional: replace placeholder in JS template
$jsContent = Get-Content $jsPath -Raw
Set-Content -Path $jsPath -Value $jsContent -Encoding UTF8

Write-Host ""
Write-Host "Page '$pageName' created successfully!" -ForegroundColor Green
Write-Host "Folder: $TargetPageFolder"
Write-Host ""

# ================================
# Ask to update enums
# ================================

$choice = Read-Host "Do you want to update the JS enums now? (y/n)"

if ($choice -match '^[Yy]$') {
    $enumScript = Join-Path $ScriptDir "..\UpdateJSEnums.bat"

    if (Test-Path $enumScript) {
        Write-Host "Running enum update script..." -ForegroundColor Cyan
        Start-Process -FilePath $enumScript -WorkingDirectory $ScriptDir -Wait
    }
    else {
        Write-Host "Enum update script not found at: $enumScript" -ForegroundColor Red
    }
}

Write-Host ""
Read-Host "Press ENTER to exit"

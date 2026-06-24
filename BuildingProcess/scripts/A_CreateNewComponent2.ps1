# ================================
# Component Creator v2
# ================================

Write-Host ""
Write-Host "=== Component Creator ===" -ForegroundColor Cyan

# Script root
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

# Global components folder
$GlobalComponents = Join-Path $ScriptDir "..\..\Resources\Raw\ui\App\components"
$GlobalComponents = (Resolve-Path $GlobalComponents).Path

# Pages root
$PagesRoot = Join-Path $ScriptDir "..\..\Resources\Raw\ui\App\pages"
$PagesRoot = (Resolve-Path $PagesRoot).Path

# JS template
$TemplatePath = Join-Path $ScriptDir "..\data\js_component_v2.js"

if (!(Test-Path $TemplatePath)) {
    Write-Host "ERROR: Template file not found at $TemplatePath" -ForegroundColor Red
    Read-Host "Press ENTER to exit"
    exit
}

$jsTemplate = Get-Content $TemplatePath -Raw

# ================================
# Ask for component name
# ================================

while ($true) {
    $inputName = Read-Host "Insert new component name"

    if ([string]::IsNullOrWhiteSpace($inputName)) {
        Write-Host "Name cannot be empty." -ForegroundColor Red
        continue
    }

    if ($inputName -notmatch '^[a-zA-Z][a-zA-Z0-9_]*$') {
        Write-Host "Invalid name. Must start with a letter and contain only letters, numbers, and underscores." -ForegroundColor Red
        continue
    }

    break
}

# Capitalize for class name
$ClassName = $inputName.Substring(0,1).ToUpper() + $inputName.Substring(1)

# ================================
# Choose destination
# ================================

Write-Host ""
Write-Host "Where do you want to save the new component?" -ForegroundColor Cyan
Write-Host "0) Global components folder (default): components/"
Write-Host ""

$pageFolders = Get-ChildItem -Path $PagesRoot -Directory | Select-Object -ExpandProperty Name

for ($i = 0; $i -lt $pageFolders.Count; $i++) {
    Write-Host "$($i+1)) Page: $($pageFolders[$i])"
}

Write-Host ""

while ($true) {
    $choice = Read-Host "Select destination (0-${pageFolders.Count})"

    if ($choice -match '^\d+$') {
        $choice = [int]$choice

        if ($choice -eq 0) {
            $TargetFolder = Join-Path $GlobalComponents $inputName
            break
        }

        if ($choice -ge 1 -and $choice -le $pageFolders.Count) {
            $selectedPage = $pageFolders[$choice - 1]
            $PageComponentsFolder = Join-Path $PagesRoot "$selectedPage\components"

            # Auto-create components folder if missing
            if (!(Test-Path $PageComponentsFolder)) {
                Write-Host "Creating missing components folder for page '$selectedPage'..." -ForegroundColor Yellow
                New-Item -ItemType Directory -Path $PageComponentsFolder | Out-Null
            }

            $TargetFolder = Join-Path $PageComponentsFolder $inputName
            break
        }
    }

    Write-Host "Invalid selection. Try again." -ForegroundColor Red
}

# ================================
# Create component folder
# ================================

if (Test-Path $TargetFolder) {
    Write-Host "Component already exists: $inputName" -ForegroundColor Yellow
    Read-Host "Press ENTER to exit"
    exit
}

New-Item -ItemType Directory -Path $TargetFolder | Out-Null

# ================================
# Create files
# ================================

$cssPath  = Join-Path $TargetFolder "$inputName.css"
$htmlPath = Join-Path $TargetFolder "$inputName.html"
$jsPath   = Join-Path $TargetFolder "$inputName.js"

New-Item -ItemType File -Path $cssPath  | Out-Null
New-Item -ItemType File -Path $htmlPath | Out-Null

# Apply template
$finalJs = $jsTemplate.Replace("ComponentTemplate", $ClassName)
$finalJs = $finalJs.Replace("__CLASSNAME__", $ClassName)

Set-Content -Path $jsPath -Value $finalJs -Encoding UTF8
Set-Content -Path $htmlPath -Value "<div>$ClassName works!</div>" -Encoding UTF8

Write-Host ""
Write-Host "Component '$inputName' created successfully!" -ForegroundColor Green
Write-Host "Folder: $TargetFolder"
Write-Host ""

# ================================
# Ask to update enum
# ================================

$choice = Read-Host "Do you want to update the JS enum now? (y/n)"

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

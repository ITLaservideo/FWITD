# Hard‑coded paths relative to the script location
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ListOfDirectories = Join-Path $ScriptDir "..\..\Resources\Raw\ui\App\components"

Write-Host "=== Component Creator ==="

# Load JS template from external file
$TemplatePath = Join-Path $ScriptDir "..\data\js_component_v2.js"

if (!(Test-Path $TemplatePath)) {
    Write-Host "ERROR: Template file not found at $TemplatePath" -ForegroundColor Red
    Read-Host "Press ENTER to exit"
    exit
}

$jsTemplate = Get-Content $TemplatePath -Raw

# Loop until valid input
while ($true) {
    $inputName = Read-Host "Insert new component name"

    if ([string]::IsNullOrWhiteSpace($inputName)) {
        Write-Host "Name cannot be empty." -ForegroundColor Red
        continue
    }

    # Validate: must start with a letter and contain only letters, numbers, underscores
    if ($inputName -notmatch '^[a-zA-Z][a-zA-Z0-9_]*$') {
        Write-Host "Invalid name. Must start with a letter and contain only letters, numbers, and underscores." -ForegroundColor Red
        continue
    }

    break
}

# Capitalize first letter for class name
$ClassName = $inputName.Substring(0,1).ToUpper() + $inputName.Substring(1)

# Target folder
$TargetFolder = Join-Path $ListOfDirectories $inputName

# Check if exists
if (Test-Path $TargetFolder) {
    Write-Host "Component already exists: $inputName" -ForegroundColor Yellow
    Read-Host "Press ENTER to exit"
    exit
}

# Create folder
New-Item -ItemType Directory -Path $TargetFolder | Out-Null

# Create files
$cssPath  = Join-Path $TargetFolder "$inputName.css"
$htmlPath = Join-Path $TargetFolder "$inputName.html"
$jsPath   = Join-Path $TargetFolder "$inputName.js"

New-Item -ItemType File -Path $cssPath  | Out-Null
New-Item -ItemType File -Path $htmlPath | Out-Null

# Replace class name in JS template
$finalJs = $jsTemplate.Replace("ComponentTemplate", $ClassName)
$finalJs = $finalJs.Replace("__CLASSNAME__", $ClassName)

# Write file
Set-Content -Path $jsPath -Value $finalJs -Encoding UTF8
Set-Content -Path $htmlPath -Value "<div>$ClassName works!</div>" -Encoding UTF8

Write-Host "Component '$inputName' created successfully!" -ForegroundColor Green
Write-Host "Folder: $TargetFolder"

Write-Host ""

# Ask user if they want to update the JS enum
$choice = Read-Host "Do you want to update the JS enum now? (y/n)"

if ($choice -match '^[Yy]$') {
    $enumScript = Join-Path $ScriptDir "SS_UpdateJSEnum_components.ps1"

    if (Test-Path $enumScript) {
        Write-Host "Running enum update script..." -ForegroundColor Cyan
        powershell -ExecutionPolicy Bypass -File $enumScript
    }
    else {
        Write-Host "Enum update script not found at: $enumScript" -ForegroundColor Red
    }
}

# Always wait before exiting
Write-Host ""
Read-Host "Press ENTER to exit"

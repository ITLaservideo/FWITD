$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$BuildingProcessDir = Join-Path $ScriptDir ".."

Write-Host "=== ClientApp Minifier ==="

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "ERROR: Node.js is required but was not found on PATH." -ForegroundColor Red
    Read-Host "Press ENTER to exit"
    exit
}

Push-Location $BuildingProcessDir
try {
    if (-not (Test-Path (Join-Path $BuildingProcessDir "node_modules"))) {
        Write-Host "Installing minifier dependencies (first run only)..." -ForegroundColor Cyan
        npm install
        if ($LASTEXITCODE -ne 0) {
            Write-Host "ERROR: npm install failed." -ForegroundColor Red
            Read-Host "Press ENTER to exit"
            exit
        }
    }

    node "scripts\minify-client-app.js"
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Minification finished with errors - see above." -ForegroundColor Red
    } else {
        Write-Host "Minification finished successfully." -ForegroundColor Green
    }
} finally {
    Pop-Location
}

Write-Host ""
Read-Host "Press ENTER to exit"

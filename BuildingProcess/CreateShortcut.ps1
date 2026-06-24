param(
    [Parameter(Mandatory = $true)]
    [string]$TargetExe,

    [Parameter(Mandatory = $true)]
    [string]$ShortcutPath,

    [string]$Arguments = "",

    [string]$IconPath = ""
)

$targetDir = Split-Path -Parent $TargetExe
if (-not (Test-Path -LiteralPath $targetDir)) {
    throw "Target directory does not exist: $targetDir"
}

$shortcutDir = Split-Path -Parent $ShortcutPath
if (-not [string]::IsNullOrWhiteSpace($shortcutDir) -and -not (Test-Path -LiteralPath $shortcutDir)) {
    New-Item -ItemType Directory -Path $shortcutDir -Force | Out-Null
}

$ws = New-Object -ComObject WScript.Shell
$shortcut = $ws.CreateShortcut($ShortcutPath)
$shortcut.TargetPath = $TargetExe
if (-not [string]::IsNullOrWhiteSpace($Arguments)) {
    $shortcut.Arguments = $Arguments
}
$shortcut.WorkingDirectory = $targetDir
if (-not [string]::IsNullOrWhiteSpace($IconPath)) {
    $shortcut.IconLocation = "$IconPath,0"
}
$shortcut.Save()

Write-Host "Created shortcut: $ShortcutPath"

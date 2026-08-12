# Self-contained: run from wherever it ends up (copied next to the built exe). Resolves everything
# relative to its own location; -ExeName only needs passing when the host sets a custom AssemblyName.
param([string]$ExeName = "FWShellWPF.exe")
$here = $PSScriptRoot
$outDir = Split-Path -Parent (Split-Path -Parent $here)
$targetExe = Join-Path $outDir $ExeName
$iconsDir = Join-Path $outDir "FWITD\icons"
$helper = Join-Path $here "CreateShortcut.ps1"

$shortcuts = @(
    @{ Name = "_WAWX_Cloudflared --start-app 1.lnk"; Args = "--start-app 1"; Icon = "cloudflare-cover2.ico" },
    @{ Name = "_WAWX_Android --start-app 5.lnk"; Args = "--start-app 5"; Icon = "android.ico" },
    @{ Name = "_WAWX_ToDoList --start-app 7.lnk"; Args = "--start-app 7"; Icon = "todo.ico" },
    @{ Name = "_WAWX_ServerStatus --start-app 12.lnk"; Args = "--start-app 12"; Icon = "server_status.ico" },
    @{ Name = "_WAWX_ImageEditor --start-app 13.lnk"; Args = "--start-app 13"; Icon = "image_editor.ico" }
)

foreach ($s in $shortcuts) {
    & $helper -TargetExe $targetExe -ShortcutPath (Join-Path $outDir $s.Name) -Arguments $s.Args -IconPath (Join-Path $iconsDir $s.Icon)
}

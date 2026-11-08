# Self-contained: run from wherever it ends up (copied next to the built exe). Resolves everything
# relative to its own location; -ExeName only needs passing when the host sets a custom AssemblyName.
param([string]$ExeName = "DevFWShellWPF.exe")
$here = $PSScriptRoot
$outDir = Split-Path -Parent (Split-Path -Parent $here)
$targetExe = Join-Path $outDir $ExeName
$iconsDir = Join-Path $outDir "FWITD\icons"
$helper = Join-Path $here "CreateShortcut.ps1"

$shortcuts = @(
    @{ Name = "_Cloudflared.lnk"; Args = "--start-app 1"; Icon = "cloudflare-cover2.ico" },
    @{ Name = "_Android.lnk"; Args = "--start-app 5"; Icon = "android.ico" },
    @{ Name = "_ToDoList.lnk"; Args = "--start-app 7"; Icon = "todo.ico" },
    @{ Name = "_ServerStatus.lnk"; Args = "--start-app 12"; Icon = "server_status.ico" },
    @{ Name = "_ImageEditor.lnk"; Args = "--start-app 13"; Icon = "image_editor.ico" },
    @{ Name = "_DCVAC5.lnk"; Args = "--start-app 9005"; Icon = "ttgh.ico" },
    @{ Name = "_TestPage.lnk"; Args = "--start-app -1"; Icon = "demo.ico" },
    @{ Name = "_Showcase.lnk"; Args = "--start-app -2"; Icon = "demo.ico" },
    @{ Name = "_Dashboard.lnk"; Args = "--start-app 0"; Icon = "demo.ico" },
    @{ Name = "_GestionaleDistributore.lnk"; Args = "--start-app 2"; Icon = "demo.ico" },
    @{ Name = "_GoogleDocs.lnk"; Args = "--start-app 4"; Icon = "demo.ico" },
    @{ Name = "_AndroidLogin.lnk"; Args = "--start-app 6"; Icon = "demo.ico" },
    @{ Name = "_TemplateJobs.lnk"; Args = "--start-app 8"; Icon = "demo.ico" },
    @{ Name = "_YouTube.lnk"; Args = "--start-app 9"; Icon = "demo.ico" },
    @{ Name = "_AndroidDebug.lnk"; Args = "--start-app 10"; Icon = "demo.ico" },
    @{ Name = "_AndroidGestionaleDistributore.lnk"; Args = "--start-app 11"; Icon = "demo.ico" },
    @{ Name = "_DashboardLettoreBarcode.lnk"; Args = "--start-app 3225"; Icon = "demo.ico" },
    @{ Name = "_DashboardLayout1.lnk"; Args = "--start-app 3226"; Icon = "demo.ico" },
    @{ Name = "_AdminSettings.lnk"; Args = "--start-app 9001"; Icon = "demo.ico" },
    @{ Name = "_PDFEditor.lnk"; Args = "--start-app 9002"; Icon = "demo.ico" },
    @{ Name = "_DataCruncher.lnk"; Args = "--start-app 9004"; Icon = "demo.ico" },
    @{ Name = "_VehicleMaintenance.lnk"; Args = "--start-app 9006"; Icon = "demo.ico" }
)

foreach ($s in $shortcuts) {
    & $helper -TargetExe $targetExe -ShortcutPath (Join-Path $outDir $s.Name) -Arguments $s.Args -IconPath (Join-Path $iconsDir $s.Icon)
}

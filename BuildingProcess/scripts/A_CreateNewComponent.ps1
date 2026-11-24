# Creates a component (Name.css/html/js, the js from data\js_component_v2.js) in one of:
#   - ClientApp\components\                                   global component
#   - ClientApp\apps_standalone\<Page>\components\            child component of a page
#   - ClientApp\apps_standalone_components\<View>\components\ child component of a ComponentView
#   - ClientApp\apps_standalone_components\                   a new ComponentView
# then optionally updates JSProvider.cs (UiBuilder: addFWJSComponent.createTheComponent).
#   -Name <Name>   don't ask for the name
#   -NoPause       skip the final "Press ENTER"
param([string]$Name, [switch]$NoPause)
. (Join-Path $PSScriptRoot "_FWCommon.ps1")

Invoke-FWMain "Component Creator" $NoPause {
    $template = Join-Path $FW.Templates "js_component_v2.js"
    Assert-FWFiles @($template)

    $componentName = Read-FWName "New component name" $Name $null

    # destinations
    $destinations = New-Object 'System.Collections.Generic.List[object]'
    $destinations.Add([pscustomobject]@{ Label = "Global component            -> components\"; Folder = $FW.GlobalComponents; View = $false })
    foreach ($p in (Get-FWFolderNames $FW.StandalonePages "apps_standalone")) {
        $destinations.Add([pscustomobject]@{ Label = "Child of page $p -> apps_standalone\$p\components\"; Folder = Join-Path (Join-Path $FW.StandalonePages $p) "components"; View = $false })
    }
    foreach ($v in (Get-FWFolderNames $FW.StandaloneComponents "apps_standalone_components")) {
        $destinations.Add([pscustomobject]@{ Label = "Child of ComponentView $v -> apps_standalone_components\$v\components\"; Folder = Join-Path (Join-Path $FW.StandaloneComponents $v) "components"; View = $false })
    }
    $destinations.Add([pscustomobject]@{ Label = "New ComponentView           -> apps_standalone_components\"; Folder = $FW.StandaloneComponents; View = $true })

    Write-Host ""
    Write-Host "Where do you want to create '$componentName'?" -ForegroundColor Cyan
    for ($i = 1; $i -lt $destinations.Count; $i++) { Write-Host ("{0,3}) {1}" -f $i, $destinations[$i].Label) }
    # the default last, right above the prompt
    if ($destinations.Count -gt 0) {
        Write-Host ("{0,3}) {1}" -f 0, $destinations[0].Label)
    }
    $last = $destinations.Count - 1
    while ($true) {
        $choice = (Read-Host "Select destination (0-$last, default 0)").Trim()
        if ($choice -eq "") { $choice = "0" }
        if ($choice -match '^\d+$' -and [int]$choice -le $last) { break }
        Write-FWErr "Invalid selection."
    }
    $destination = $destinations[[int]$choice]
    $folder = Join-Path $destination.Folder $componentName
    if (Test-Path -LiteralPath $folder) { throw "Component already exists: $folder" }

    $className = $componentName.Substring(0, 1).ToUpper() + $componentName.Substring(1)
    $js = [System.IO.File]::ReadAllText($template).Replace("ComponentTemplate", $className).Replace("__CLASSNAME__", $className)

    New-Item -ItemType Directory -Path $folder -Force | Out-Null
    Write-FWNewFile (Join-Path $folder "$componentName.css") ""
    Write-FWNewFile (Join-Path $folder "$componentName.html") "<div>$className works!</div>"
    Write-FWNewFile (Join-Path $folder "$componentName.js") $js

    $kind = if ($destination.View) { "ComponentView" } else { "Component" }
    Write-FWOk "$kind '$componentName' created: $folder"

    if (Read-FWYesNo "Update JSProvider.cs enums?" $true) {
        Update-FWJSEnums
    }
}

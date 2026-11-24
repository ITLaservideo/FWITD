# Creates a standalone page: ClientApp\apps_standalone\<Name>\ (Name.css/html/js from data\template_page.*,
# jsconfig.json, components\), then optionally updates JSProvider.cs and registers StartApp.<Name> in AppConfig.cs
# (UiBuilder: addFWJSComponent.createThePage).
#   -Name <Name>   don't ask for the name
#   -NoPause       skip the final "Press ENTER"
param([string]$Name, [switch]$NoPause)
. (Join-Path $PSScriptRoot "_FWCommon.ps1")

Invoke-FWMain "Page Creator" $NoPause {
    $tCss = Join-Path $FW.Templates "template_page.css"
    $tHtml = Join-Path $FW.Templates "template_page.html"
    $tJs = Join-Path $FW.Templates "template_page.js"
    $tJsconfig = Join-Path $FW.Templates "jsconfig_apps_standalone_and_injectables.json"
    Assert-FWFiles @($tCss, $tHtml, $tJs, $tJsconfig)
    if (-not (Test-Path -LiteralPath $FW.StandalonePages -PathType Container)) { throw "Pages folder not found: $($FW.StandalonePages)" }

    $pageName = Read-FWName "New page name" $Name {
        param($n)
        if (Test-Path -LiteralPath (Join-Path $FW.StandalonePages $n)) { "Page already exists: $n" }
    }

    $folder = Join-Path $FW.StandalonePages $pageName
    New-Item -ItemType Directory -Path (Join-Path $folder "components") -Force | Out-Null
    Copy-Item -LiteralPath $tCss -Destination (Join-Path $folder "$pageName.css")
    Copy-Item -LiteralPath $tHtml -Destination (Join-Path $folder "$pageName.html")
    Write-FWNewFile (Join-Path $folder "$pageName.js") ([System.IO.File]::ReadAllText($tJs).Replace("__PAGENAME__", $pageName))
    Copy-Item -LiteralPath $tJsconfig -Destination (Join-Path $folder "jsconfig.json")

    Write-FWOk "Page '$pageName' created: $folder"

    if (Read-FWYesNo "Update JSProvider.cs enums and register StartApp.$pageName in AppConfig.cs?" $true) {
        Update-FWJSEnums
        Update-FWAppConfigStartApp $pageName
    }
}

# Creates an injectable app: ClientApp\apps_injectable\<Name>\ with Name.js (+ optional Name.html / Name.css)
# and jsconfig.json, then optionally updates JSProvider.cs (UiBuilder: addFWJSComponent.createInjectableApp).
# The StartApp / AppConfig._scripts entry is not added: an injectable needs the url of the page it's injected into.
#   -Name <Name>   don't ask for the name
#   -NoPause       skip the final "Press ENTER"
param([string]$Name, [switch]$NoPause)
. (Join-Path $PSScriptRoot "_FWCommon.ps1")

Invoke-FWMain "Injectable App Creator" $NoPause {
    $tComponent = Join-Path $FW.Templates "js_component_v2.js"
    $tJs = Join-Path $FW.Templates "template_injectable.js"
    $tHtml = Join-Path $FW.Templates "template_injectable.html"
    $tCss = Join-Path $FW.Templates "template_injectable.css"
    $tJsconfig = Join-Path $FW.Templates "jsconfig_apps_standalone_and_injectables.json"
    if (-not (Test-Path -LiteralPath $FW.Injectables -PathType Container)) { throw "Injectables folder not found: $($FW.Injectables)" }

    $appName = Read-FWName "New injectable app name" $Name {
        param($n)
        if (Test-Path -LiteralPath (Join-Path $FW.Injectables $n)) { "Injectable already exists: $n" }
    }
    $includeHtml = Read-FWYesNo "Include an .html (the App becomes a FrameworkGC component)?" $false
    $includeCss = Read-FWYesNo "Include a .css?" $false

    $jsTemplate = if ($includeHtml) { $tComponent } else { $tJs }
    $required = @($jsTemplate, $tJsconfig)
    if ($includeHtml) { $required += $tHtml }
    if ($includeCss) { $required += $tCss }
    Assert-FWFiles $required

    $folder = Join-Path $FW.Injectables $appName
    New-Item -ItemType Directory -Path $folder -Force | Out-Null
    if ($includeHtml) { Copy-Item -LiteralPath $tHtml -Destination (Join-Path $folder "$appName.html") }
    if ($includeCss) { Copy-Item -LiteralPath $tCss -Destination (Join-Path $folder "$appName.css") }
    $js = [System.IO.File]::ReadAllText($jsTemplate)
    $js = $js.Replace("@fromwho", $appName).Replace("ComponentTemplate", "App").Replace("__CLASSNAME__", "App")
    $js = $js.Replace("constructor(options)", "constructor(options = {})").Replace("super(options);", "super(options);AppStatus.displayVersion();")
    Write-FWNewFile (Join-Path $folder "$appName.js") $js
    Copy-Item -LiteralPath $tJsconfig -Destination (Join-Path $folder "jsconfig.json")

    Write-FWOk "Injectable '$appName' created: $folder"
    Write-FWWarn "Remember: add its StartApp value and AppConfig._scripts entry (with the target url) by hand."

    if (Read-FWYesNo "Update JSProvider.cs enums?" $true) {
        Update-FWJSEnums
    }
}

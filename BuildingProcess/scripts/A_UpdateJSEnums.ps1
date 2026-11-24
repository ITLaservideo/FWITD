# Regenerates the enums / dictionaries of FWITD\JSProvider.cs from the folders of FWITD\ClientApp
# (UiBuilder: UpdaterEnums.updateAll). -NoPause skips the final "Press ENTER".
param([switch]$NoPause)
. (Join-Path $PSScriptRoot "_FWCommon.ps1")

Invoke-FWMain "JS Enums Updater" $NoPause {
    Update-FWJSEnums
}

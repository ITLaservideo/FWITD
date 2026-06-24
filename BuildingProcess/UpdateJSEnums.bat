@echo off
powershell -ExecutionPolicy Bypass -File "%~dp0\scripts\SS_UpdateJSEnum_components.ps1"
powershell -ExecutionPolicy Bypass -File "%~dp0\scripts\SS_UpdateJSEnum_frameworks.ps1"
powershell -ExecutionPolicy Bypass -File "%~dp0\scripts\SS_UpdateJSEnum_pages.ps1"
powershell -ExecutionPolicy Bypass -File "%~dp0\scripts\SS_UpdateJSEnum_utils.ps1"
powershell -ExecutionPolicy Bypass -File "%~dp0\scripts\SS_UpdateJSDict_page_to_components.ps1"
pause
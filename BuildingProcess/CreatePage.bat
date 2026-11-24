@echo off
rem extra arguments are passed to the script, e.g. -NoPause / -Name <Name>
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\A_CreateNewPage.ps1" %*

@echo off
rem extra arguments are passed to the script, e.g. -NoPause
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\A_MinifyClientApp.ps1" %*

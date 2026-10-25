@echo off
rem Double-click to create the Petal Reader desktop / Start menu shortcuts and install the VS Code add-on.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0tools\setup.ps1"
echo.
pause

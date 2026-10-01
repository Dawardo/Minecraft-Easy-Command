@echo off
title Bedrock Music Maker - Auto Builder
cd /d "%~dp0"
echo Bedrock Music Maker - Auto Builder
echo Tip: drag a .slabplan.json file onto this .bat, or it will find the newest one in your Downloads.
echo.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0tools\auto-builder.ps1" %*
echo.
pause

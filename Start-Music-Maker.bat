@echo off
title Bedrock Music Maker
cd /d "%~dp0"
echo Starting Bedrock Music Maker...
echo (Keep this window open while you use the page. Close it to stop.)
echo.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0server\server.ps1"
if errorlevel 1 (
  echo.
  echo The local server could not start. Opening the page directly instead...
  start "" "%~dp0web\index.html"
  pause
)

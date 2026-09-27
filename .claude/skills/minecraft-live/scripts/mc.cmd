@echo off
rem Launcher for mc.py on Windows (cmd / PowerShell). Set MC_PYTHON to override the Python used.
setlocal
set "PYTHONIOENCODING=utf-8"
set "HERE=%~dp0"
if defined MC_PYTHON (
  "%MC_PYTHON%" "%HERE%mc.py" %*
  exit /b %ERRORLEVEL%
)
py -3 -c "import sys; sys.exit(0 if sys.version_info >= (3, 8) else 1)" >nul 2>nul && (
  py -3 "%HERE%mc.py" %*
  exit /b %ERRORLEVEL%
)
python -c "import sys; sys.exit(0 if sys.version_info >= (3, 8) else 1)" >nul 2>nul && (
  python "%HERE%mc.py" %*
  exit /b %ERRORLEVEL%
)
echo Python 3.8+ not found. Install it: winget install -e --id Python.Python.3.12
exit /b 127

@echo off
setlocal
title Tether Installer
cd /d "%~dp0"

set "NODE_EXE=%LOCALAPPDATA%\Tether\node\node.exe"
if exist "%NODE_EXE%" goto run

set "NODE_MAJOR="
where node >nul 2>nul
if errorlevel 1 goto bootstrap
for /f "tokens=1 delims=." %%v in ('node -v 2^>nul') do set "NODE_MAJOR=%%v"
set "NODE_MAJOR=%NODE_MAJOR:v=%"
if not defined NODE_MAJOR goto bootstrap
if %NODE_MAJOR% GEQ 22 (
    set "NODE_EXE=node"
    goto run
)

:bootstrap
echo Node.js was not found or is older than 22. Downloading a portable copy, one time only.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0bootstrap-node.ps1"
if not exist "%NODE_EXE%" (
    echo.
    echo Could not set up Node.js automatically.
    echo Install it from https://nodejs.org and run this file again.
    pause
    exit /b 1
)

:run
echo.
"%NODE_EXE%" "%~dp0index.mjs" %*
echo.
echo Press any key to close.
pause >nul

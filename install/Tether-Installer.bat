@echo off
setlocal
title Tether Installer
cd /d "%~dp0"

set "NODE_EXE=%LOCALAPPDATA%\Tether\node\node.exe"
if exist "%NODE_EXE%" goto run

where node >nul 2>nul
if not errorlevel 1 (
    set "NODE_EXE=node"
    goto run
)

echo Node.js was not found. Downloading a portable copy, one time only.
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

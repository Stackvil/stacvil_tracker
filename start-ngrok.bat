@echo off
setlocal enabledelayedexpansion
title Stackvil Tracker - Live Server with ngrok
echo =======================================================
echo     Starting Stackvil Tracker Server + ngrok Tunnel
echo =======================================================
echo.

cd /d "%~dp0"

:: Check ngrok executable
if not exist "%~dp0ngrok.exe" (
    echo [!] ngrok.exe not found in current folder, checking PATH...
    where ngrok >nul 2>&1
    if %ERRORLEVEL% NEQ 0 (
        echo [ERROR] ngrok is not installed or not found.
        pause
        exit /b 1
    )
    set NGROK_CMD=ngrok
) else (
    set NGROK_CMD="%~dp0ngrok.exe"
)

:: Verify ngrok authentication
echo [1/3] Checking ngrok authentication status...
%NGROK_CMD% config check >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo =======================================================
    echo [!] ngrok requires a free account authentication token.
    echo Get your token here: https://dashboard.ngrok.com/get-started/your-authtoken
    echo =======================================================
    echo.
    set /p NGROK_TOKEN="Paste your ngrok AuthToken here: "
    if not "!NGROK_TOKEN!"=="" (
        %NGROK_CMD% config add-authtoken !NGROK_TOKEN!
        echo [+] AuthToken configured successfully!
    ) else (
        echo [!] No token entered. ngrok may fail to start.
    )
)

:: Start Backend Server
echo [2/3] Starting Backend Server (Port 5001)...
start "Stackvil Tracker Backend (Port 5001)" cmd /k "cd /d %~dp0backend && node server.js"

:: Give the server a moment to spin up
timeout /t 2 /nobreak >nul

:: Start ngrok Tunnel
echo [3/3] Starting ngrok Tunnel on port 5001...
echo.
echo Tunneling http://localhost:5001...
echo.

:: Try starting with the reserved static domain first
%NGROK_CMD% http --url=charrier-michaela-archiepiscopal.ngrok-free.dev 5001
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [!] Static domain failed or not claimed by your account.
    echo Starting standard ngrok tunnel on port 5001...
    %NGROK_CMD% http 5001
)

pause

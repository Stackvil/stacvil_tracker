@echo off
echo Starting Stackvil Tracker Backend Server & Cloudflare Tunnel...
start "Backend Server (Port 5000)" cmd /k "cd backend && node server.js"
start "Cloudflare Tunnel (track.stackvil.com)" cmd /k "cloudflared.exe --config config.yml tunnel run stackvil-tracker"

echo.
echo =======================================================
echo  Server and Cloudflare Tunnel Started Successfully!
echo  Your backend API is now live at: https://track.stackvil.com
echo =======================================================

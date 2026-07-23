@echo off
cd /d "%~dp0"

echo Starting SCHRG Metrics (Production)...
echo.

REM Start Express backend with production build
start "Express API Server" cmd /k "node dist/index.js"

REM Start Vite preview server
timeout /t 2 /nobreak
start "Vite Preview Server" cmd /k "npm run preview"

REM Open browser
timeout /t 2 /nobreak
start http://localhost:4173

echo.
echo ==========================================
echo SCHRG Metrics is running (Production)!
echo Frontend: http://localhost:4173
echo Backend API: http://localhost:3001
echo ==========================================
echo Close the command windows to stop the app.
pause

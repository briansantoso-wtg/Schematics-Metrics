@echo off
cd /d "%~dp0"

REM Check if node_modules exist, if not install dependencies
if not exist "node_modules\" (
    echo Installing dependencies...
    call npm install
)

REM Start Vite and Express in parallel
echo Starting SCHRG Metrics...
echo.

REM Start Vite dev server
start "Vite Dev Server" cmd /k "npx vite --host"

REM Wait a moment for Vite to start
timeout /t 3 /nobreak

REM Start Express backend
start "Express API Server" cmd /k "npx tsx watch server/index.ts"

REM Open browser
timeout /t 2 /nobreak
start http://localhost:5173

echo.
echo ==========================================
echo SCHRG Metrics is running!
echo Frontend: http://localhost:5173
echo Backend API: http://localhost:3001
echo ==========================================
echo Close the command windows to stop the app.
pause

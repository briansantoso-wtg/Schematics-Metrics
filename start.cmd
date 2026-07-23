@echo off
cd /d "%~dp0"

if not exist "node_modules" (
    echo Installing dependencies...
    call npm install
)

echo Starting SCHRG Metrics...
start "Vite" cmd /k "npx vite --host"
timeout /t 3 /nobreak
start "API" cmd /k "npx tsx watch server/index.ts"
timeout /t 2 /nobreak
start http://localhost:5173

echo App running at http://localhost:5173

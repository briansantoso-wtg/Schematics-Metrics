@echo off
cd /d "%~dp0"

echo Building SCHRG Metrics for production...
echo.

call npm run build

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ==========================================
    echo Build completed successfully!
    echo Run 'run-prod.cmd' to start the app
    echo ==========================================
) else (
    echo.
    echo Build failed. Check errors above.
)

pause

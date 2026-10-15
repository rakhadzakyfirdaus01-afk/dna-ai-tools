@echo off
title DNA AI - Antigravity Desktop App
echo ========================================================
echo   DNA AI - Antigravity 2.0 Autonomous IDE Desktop
echo ========================================================
echo.
echo Memulai DNA AI Desktop Application...
echo.

:: Cek apakah server lokal sudah aktif di port 3000
netstat -ano | findstr :3000 >nul
if %ERRORLEVEL% EQU 0 (
    echo [INFO] Server DNA AI terdeteksi sudah aktif di http://localhost:3000
    goto LaunchApp
)

echo [INFO] Menjalankan server lokal Next.js...
start /B npm run dev >nul 2>&1
timeout /t 4 /nobreak >nul

:LaunchApp
echo [INFO] Membuka jendela DNA AI Standalone Application Window...

:: Cari Microsoft Edge atau Google Chrome untuk menjalankan --app window mode
if exist "%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe" (
    start "" "%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe" --app=http://localhost:3000/ai-assistant --window-size=1440,900
    exit /b
)

if exist "%ProgramFiles%\Microsoft\Edge\Application\msedge.exe" (
    start "" "%ProgramFiles%\Microsoft\Edge\Application\msedge.exe" --app=http://localhost:3000/ai-assistant --window-size=1440,900
    exit /b
)

if exist "%ProgramFiles%\Google\Chrome\Application\chrome.exe" (
    start "" "%ProgramFiles%\Google\Chrome\Application\chrome.exe" --app=http://localhost:3000/ai-assistant --window-size=1440,900
    exit /b
)

if exist "%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe" (
    start "" "%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe" --app=http://localhost:3000/ai-assistant --window-size=1440,900
    exit /b
)

:: Fallback default browser jika browser di atas tidak ditemukan
start http://localhost:3000/ai-assistant
exit /b

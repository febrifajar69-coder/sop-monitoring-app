@echo off
title Push Update to GitHub
cd /d "C:\Users\Ebix25\.gemini\antigravity\scratch\sop-monitoring-app"
echo ============================================================
echo   MENGIRIM UPDATE PROJECT KE GITHUB (febrifajar69-coder)
echo ============================================================
echo.
"C:\Users\Ebix25\AppData\Local\Programs\Git\cmd\git.exe" add .
"C:\Users\Ebix25\AppData\Local\Programs\Git\cmd\git.exe" commit -m "update: sync project files"
"C:\Users\Ebix25\AppData\Local\Programs\Git\cmd\git.exe" push -u origin main
echo.
echo ============================================================
echo   SELESAI! Tekan sembarang tombol untuk keluar...
echo ============================================================
pause

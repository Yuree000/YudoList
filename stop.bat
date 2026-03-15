@echo off
powershell -ExecutionPolicy Bypass -WindowStyle Hidden -Command "Get-NetTCPConnection -LocalPort 3000,3001 -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }"
echo 项目已停止
timeout /t 2 >nul

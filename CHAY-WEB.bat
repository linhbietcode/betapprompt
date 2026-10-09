@echo off
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Can cai Node.js 22 tro len truoc khi chay.
  echo Sau khi cai, dong va mo lai cua so nay.
  pause
  exit /b 1
)
node -e "process.exit(Number(process.versions.node.split('.')[0]) >= 22 ? 0 : 1)"
if errorlevel 1 (
  echo Hay cap nhat Node.js len phien ban 22 tro len.
  pause
  exit /b 1
)
node local-server.mjs --open
pause

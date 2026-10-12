@echo off
cd /d "%~dp0"
if not exist node_modules call npm install
echo Project Reboot opens at http://127.0.0.1:5174
echo Keep this window open while using your private workspace.
call npm run dev
pause

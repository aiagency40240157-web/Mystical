@echo off
echo Iniciando Mystical Spa...

echo [1/3] Backend API (puerto 3000)...
start "Backend API" cmd /k "cd /d f:\mystical && npm run start:dev"

echo [2/3] Frontend (puerto 3001)...
start "Frontend" cmd /k "cd /d f:\mystical\frontend && npm run dev"

echo [3/3] WhatsApp Bot...
start "WhatsApp Bot" cmd /k "cd /d f:\mystical\chatbot-mvp && node index.js"

echo.
echo Listo. Abre http://localhost:3001 en tu navegador.
echo Para ver el QR del bot, mira la ventana "WhatsApp Bot".
pause

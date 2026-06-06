# DIRECTIVA ANTIGRAVITY: SYSTEM_DEPLOYMENT (SOP-003)

## Objetivo

Definir y ejecutar la estrategia de despliegue para llevar el proyecto fuera de `localhost` utilizando una plataforma PaaS (Railway/Render) conectada a GitHub, garantizando la compatibilidad con bases de datos relacionales, el sistema de colas Redis y el bot de WhatsApp (Puppeteer).

## Arquitectura de Despliegue Propuesta (Opción B)

1. **Frontend (Next.js):** Desplegado de forma estática en **Firebase Hosting** (ya completado con éxito y accesible en `https://mystical-scheduling-2026.web.app`).
2. **Backend (NestJS):** Desplegado como servicio continuo en **Railway / Render** a partir del `Dockerfile` en el directorio raíz.
3. **Base de Datos (PostgreSQL):** Base de datos relacional PostgreSQL administrada y aprovisionada dentro de la misma red de **Railway / Render**.
4. **Sistema de Colas (Redis):** Instancia de Redis administrada y aprovisionada dentro de la misma red de **Railway / Render**.
5. **Bot de WhatsApp:** Desplegado como servicio continuo e independiente en **Railway / Render** a partir de `chatbot-mvp/Dockerfile`, con un **Volume persistente** montado en `/app/.wwebjs_auth` para evitar tener que re-escanear el código QR en cada reinicio.

## Plan de Ejecución

1. **Creación del Dockerfile del Bot:** Generar `chatbot-mvp/Dockerfile` con dependencias de Chromium/Puppeteer.
2. **Preparar variables de entorno:** Definir los secretos y variables de producción.
3. **Inicializar/Vincular Git:** Configurar el control de versiones y preparar el push hacia GitHub.
4. **Despliegue y escaneo del QR:** Conectar Railway/Render con el repositorio de GitHub, iniciar servicios y leer el código QR desde los logs para activar el bot de WhatsApp.

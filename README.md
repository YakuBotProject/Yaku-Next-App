# Yaku Next App

Frontend web de Yaku. Esta aplicacion no se conecta a PostgreSQL: toda la persistencia, reglas de negocio, MQTT, ML y control IoT viven en el backend FastAPI (`YakuESP32`).

```text
Next.js -> FastAPI -> PostgreSQL
ESP32 -> MQTT -> FastAPI -> PostgreSQL
FastAPI -> MQTT -> ESP32
```

## Getting Started

1. Copia `.env.example` a `.env`.
2. Configura `FASTAPI_API_URL`, `BFF_JWT_SECRET`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL` y `NEXT_PUBLIC_WS_URL`.
3. Ejecuta el servidor:

```bash
npm run dev
```

Abre `http://localhost:3000` en el navegador.

## Backend API

El unico cliente HTTP hacia el backend esta en:

```text
src/lib/api/client.ts
```

Usa:

- `fetchPublicFastAPI` para login/registro u otras rutas sin sesion NextAuth.
- `fetchFromFastAPI` para rutas autenticadas; genera un `X-BFF-Token` firmado, con usuario, audiencia y expiracion corta.

No agregues `DATABASE_URL`, Prisma, `pg`, ni consultas SQL en este proyecto.

## Despliegue separado en la nube

El navegador se comunica con Next.js y Next.js se comunica con FastAPI usando
`FASTAPI_API_URL`. Por eso las peticiones HTTP autenticadas no requieren CORS.
Configura en el servicio de frontend:

```env
FASTAPI_API_URL=https://api.example.com
NEXTAUTH_URL=https://app.example.com
NEXT_PUBLIC_WS_URL=wss://api.example.com/ws/alertas
SERVER_ACTION_ALLOWED_ORIGINS=app.example.com
BFF_JWT_SECRET=<secreto-compartido>
```

En FastAPI configura `ALLOWED_ORIGINS=https://app.example.com` para validar el
WebSocket y usa exactamente el mismo `BFF_JWT_SECRET`. Las variables
`NEXT_PUBLIC_*` deben existir antes de compilar el frontend.

## IoT

La documentacion del flujo MQTT y los payloads de sensores esta en `SENSORES_API.md`.

## Scripts

```bash
npm run dev
npm run build
npm run start
npm run lint
npm run audit:security
```

# Saywhat — captions that pop

Subtítulos animados palabra por palabra para videos cortos. Editables, con export de video (subtítulos incrustados), SRT y VTT. **El video nunca sale del navegador**: solo se envía el audio (WAV 16 kHz) para transcribir.

## Stack

- **Next.js 16** (App Router) + **TypeScript** strict · **bun**
- **Tailwind v4 + shadcn/ui** (base Radix, estilo **Mira**), oscuro por defecto
- **Zustand** (editor con historial de deshacer/rehacer; reproducción en un store aparte para no re-renderizar por frame)
- **Web Audio API** para extraer el audio · **Canvas + MediaRecorder** para exportar el video
- **Whisper** en Cloudflare Workers AI, vía Route Handler (`src/app/api/transcribe`)
- **Better Auth** (email + contraseña, Google opcional) · **Drizzle ORM** sobre **libSQL** (SQLite local, Turso en producción)
- Packs de créditos prepagos (1 crédito = 1 video) con dos medios de pago: **Paddle** (USD, merchant of record, para compradores de todo el mundo) y **Mercado Pago Checkout Pro** (ARS, para Argentina)
- **Vitest** para la lógica de subtítulos y de cobros (firmas de webhooks, acreditación idempotente)

## Desarrollo

```bash
bun install
cp .env.example .env.local   # completá las variables (ver abajo)
bun run db:push              # crea las tablas en local.db
bun dev                      # http://localhost:3000
bun run test                 # vitest
```

### Variables de entorno

| Variable | Para qué |
| --- | --- |
| `CF_ACCOUNT_ID`, `CF_API_TOKEN` | Transcripción (token con permiso "Workers AI") |
| `BETTER_AUTH_SECRET` | Firma de sesiones (`openssl rand -base64 32`) |
| `BETTER_AUTH_URL` | URL pública de la app |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Opcional: botón "Continue with Google" (redirect: `<BETTER_AUTH_URL>/api/auth/callback/google`) |
| `DATABASE_URL`, `DATABASE_AUTH_TOKEN` | `file:local.db` en dev; `libsql://…` + token de Turso en producción |
| `MP_ACCESS_TOKEN` | Access token de Mercado Pago (usá las credenciales de **prueba** mientras desarrollás) |
| `MP_WEBHOOK_SECRET` | Clave secreta del webhook (Tus integraciones → Webhooks, evento "Pagos") |
| `APP_URL` | URL pública para las URLs de retorno y los webhooks |
| `PADDLE_ENV` | `sandbox` mientras desarrollás, `production` en producción |
| `PADDLE_API_KEY` | API key de Paddle (Developer tools → Authentication), permisos de transacciones |
| `NEXT_PUBLIC_PADDLE_CLIENT_TOKEN` | Client-side token (`test_…` en sandbox, `live_…` en producción) |
| `PADDLE_PRODUCT_ID` | Producto `pro_…` "Saywhat video credits" del catálogo de Paddle |
| `PADDLE_WEBHOOK_SECRET` | Secret key del destino de notificaciones de Paddle |

### Pagos

- Los packs y sus precios en **USD** y **ARS** están en `src/lib/billing/packs.ts` (unidades enteras: dólares y pesos).
- Quién ve qué: por defecto todos ven **USD con Paddle**; los visitantes de Argentina (header `x-vercel-ip-country = AR`) ven **ARS con Mercado Pago**. En `/app/credits` hay un selector "Pay in USD / Pay in ARS" (`?pay=usd|ars`) cuando los dos medios están configurados; si solo hay uno, se usa ese.
- Flujo: `/app/credits` → Server Action crea la orden (`order.provider` = `paddle` | `mercadopago`) y el checkout del proveedor → el comprador paga → vuelve a `/api/checkout/return`, que consulta el pago en la API del proveedor y acredita.
- Los webhooks (`/api/webhooks/paddle`, `/api/webhooks/mercadopago`) validan la firma y hacen lo mismo. La acreditación (`applyPayment` en `src/lib/billing/orders.ts`) es compartida, idempotente (`credited_at`: nunca acredita dos veces) y verifica proveedor, moneda, monto y que el pago sea de esa orden.

#### Paddle (USD, internacional)

Paddle es el *merchant of record*: le vende al cliente final, cobra y liquida el sales tax/IVA de cada país, y te paga a vos. Acepta tarjetas, Apple Pay, Google Pay y PayPal.

1. Creá una cuenta de **sandbox** en https://sandbox-vendors.paddle.com/signup (no requiere aprobación).
2. **Catalog → Products → New product**: "Saywhat video credits", categoría de impuestos *Standard digital goods* (o *SaaS*). No hace falta crear precios: la app crea un precio por transacción con el monto de `packs.ts`. Copiá el id `pro_…` en `PADDLE_PRODUCT_ID`.
3. **Developer tools → Authentication**: generá una API key con permisos de lectura y escritura de transacciones (`PADDLE_API_KEY`) y un client-side token (`NEXT_PUBLIC_PADDLE_CLIENT_TOKEN`).
4. **Checkout → Checkout settings → Default payment link**: `<APP_URL>/pay`. Esa página carga Paddle.js y abre el checkout de la transacción (`?_ptxn=txn_…`). En producción el dominio tiene que estar aprobado por Paddle.
5. **Developer tools → Notifications → New destination**: URL `<APP_URL>/api/webhooks/paddle`, eventos `transaction.paid`, `transaction.completed` y `transaction.payment_failed`. Copiá la secret key en `PADDLE_WEBHOOK_SECRET`.
6. Probá con la tarjeta de prueba `4242 4242 4242 4242`, CVC `100` y cualquier fecha futura. Para que lleguen los webhooks en local usá un túnel (p. ej. `cloudflared tunnel --url http://localhost:3000`) y usá esa URL en el destino de notificaciones. Aunque el webhook no llegue, el retorno a `/api/checkout/return` acredita igual.
7. Para producción: creá la cuenta live en https://vendors.paddle.com, completá la verificación (identidad, datos del negocio, web con precios, términos, política de privacidad y de reembolsos, dominio), configurá el método de cobro (transferencia en USD o Payoneer), repetí los pasos 2–5 y poné `PADDLE_ENV=production`.

#### Mercado Pago (ARS, Argentina)

- En `localhost` MP no acepta `auto_return` ni webhooks: el comprador vuelve tocando "Volver al sitio" y el retorno sincroniza el pago igual. Para probar el webhook en local usá un túnel y poné esa URL `https` en `APP_URL`.
- Webhook: Tus integraciones → Webhooks, evento "Pagos", URL `<APP_URL>/api/webhooks/mercadopago`.

## Deploy (Vercel)

1. Importá el repo en https://vercel.com/new (detecta Next.js solo).
2. Creá una base en Turso y aplicá el esquema: `DATABASE_URL=libsql://… DATABASE_AUTH_TOKEN=… bun run db:push`.
3. Cargá todas las variables de entorno de la tabla de arriba (con credenciales de **producción** de MP y Paddle, y `PADDLE_ENV=production`).
4. Deploy y configurá los webhooks: Mercado Pago → `https://<tu-dominio>/api/webhooks/mercadopago`, Paddle → `https://<tu-dominio>/api/webhooks/paddle`; y el default payment link de Paddle → `https://<tu-dominio>/pay`.

Límite: ~2 min de video (Vercel corta los bodies de funciones en 4.5 MB).

**Ejemplo para el botón "Probar con un ejemplo":** dejá un video corto en `public/sample.mp4`.

## Estructura

```
src/
  app/                    landing (/), login/registro ((auth)), app protegida (/app, /app/credits), APIs
  components/site/        logo, header/footer y secciones de la landing
  components/account/     formulario de auth, provider de cuenta, menú de usuario, header de la app
  components/saywhat/     app, dropzone, procesamiento, editor, transcripción, preview, estilos, export
  db/                     esquema Drizzle (tablas de Better Auth, órdenes, historial de créditos)
  lib/billing/            packs (USD/ARS), clientes de Paddle y Mercado Pago, elección de proveedor, órdenes y acreditación
  lib/                    auth, sesión, créditos, audio, pipeline, export de video
  proxy.ts                redirige /app/* a /login si no hay cookie de sesión
  components/ui/          componentes shadcn (Mira)
  lib/captions/           tipos, agrupado y tiempos, formatos SRT/VTT, presets, render en canvas
  lib/                    audio (extracción + WAV), pipeline, export de video
  store/                  editor (palabras, estilo, historial) y player (tiempo de reproducción)
```

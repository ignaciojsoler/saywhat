# Saywhat — captions that pop

Subí un video corto y obtené subtítulos animados palabra por palabra, editables, con export SRT. Corre en Cloudflare Pages + Workers AI (Whisper), dentro del plan gratis.

- El audio se extrae en el navegador (WAV 16 kHz mono): el video nunca sale de tu máquina.
- `functions/api/transcribe.js` llama a Whisper con el binding `env.AI`: no hay tokens en el código.

## Desarrollo

```bash
bun install
bun run dev        # http://localhost:8788 (usa Workers AI real de tu cuenta)
```

## Deploy

```bash
bunx wrangler login            # una sola vez
bun run deploy                 # crea/actualiza el proyecto "saywhat" en Cloudflare Pages
```

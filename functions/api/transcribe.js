// POST /api/transcribe — body: WAV (16 kHz mono, lo genera el navegador) → { text, words: [{w, s, e}], source }
// Corre en Cloudflare Pages Functions con el binding de Workers AI: no hay tokens en el código.

const MODEL = '@cf/openai/whisper';          // MIT
const MAX_BYTES = 6 * 1024 * 1024;           // ~3 min de WAV 16 kHz mono

// "00:01.500" o "00:00:01.500" → segundos
const toSec = s => s.trim().split(':').reduce((acc, p) => acc * 60 + parseFloat(p.replace(',', '.')), 0);

// Respaldo: si el modelo no devuelve tiempos por palabra, repartir cada frase del VTT entre sus palabras
function wordsFromVtt(vtt) {
  const out = [];
  const re = /([\d:.,]+)\s*-->\s*([\d:.,]+)[^\n]*\n([\s\S]*?)(?:\n\n|$)/g;
  let m;
  while ((m = re.exec(vtt))) {
    const s = toSec(m[1]), e = toSec(m[2]);
    const toks = m[3].trim().split(/\s+/).filter(Boolean);
    const d = (e - s) / (toks.length || 1);
    toks.forEach((w, i) => out.push({ w, s: s + i * d, e: s + (i + 1) * d }));
  }
  return out;
}

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

export async function onRequestPost({ request, env }) {
  try {
    const buf = await request.arrayBuffer();
    if (!buf.byteLength) return json({ error: 'Audio vacío' }, 400);
    if (buf.byteLength > MAX_BYTES) return json({ error: 'Audio demasiado largo (máx. ~3 min)' }, 400);

    const res = await env.AI.run(MODEL, { audio: [...new Uint8Array(buf)] });

    let words = (res.words || [])
      .filter(w => w && w.word != null && w.start != null && w.end != null)
      .map(w => ({ w: String(w.word).trim(), s: +w.start, e: +w.end }))
      .filter(w => w.w);
    let source = 'words';
    if (!words.length && res.vtt) { words = wordsFromVtt(res.vtt); source = 'vtt'; }
    return json({ text: res.text || '', words, source });
  } catch (e) {
    return json({ error: e.message || 'Error del modelo' }, 502);
  }
}

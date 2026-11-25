"use client"

import { useEffect, useRef } from "react"

const VS = `
attribute vec2 a_pos;
void main(){ gl_Position = vec4(a_pos, 0.0, 1.0); }
`

/**
 * Liquid chrome ribbons. A smooth height field (domain-warped sines) is sliced into contour
 * bands; every other band is shaded as a polished metal tube whose cross-section normal
 * follows the field's gradient, reflecting a dark studio with softbox strips and a key light.
 * Sines instead of hash noise: smooth at mediump precision and cheap on mobile GPUs.
 */
const FS = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
uniform vec2 u_res;
uniform float u_time;

float field(vec2 p, float t) {
  p += 0.55 * vec2(sin(p.y * 1.15 + t * 0.35), cos(p.x * 0.95 - t * 0.28));
  p += 0.30 * vec2(sin(p.y * 2.05 - t * 0.22 + 1.7), cos(p.x * 1.85 + t * 0.31 + 0.4));
  return sin(p.x * 1.25 + p.y * 0.85) + 0.65 * sin(p.x * -0.62 + p.y * 1.45 + 2.1);
}

float studio(vec3 r) {
  float sky = smoothstep(0.0, 1.0, r.y) * 0.55;
  float strips = smoothstep(0.80, 0.98, 0.5 + 0.5 * sin(r.x * 3.1 + r.y * 2.2 + 0.6));
  float key = pow(max(dot(r, normalize(vec3(-0.45, 0.7, 0.55))), 0.0), 30.0) * 3.0;
  float ground = smoothstep(0.1, -0.6, r.y);
  return (sky * 0.8 + strips * 1.6 + key) * (1.0 - 0.85 * ground) + 0.02;
}

void main() {
  vec2 uv = (gl_FragCoord.xy - 0.5 * u_res) / u_res.y;
  vec2 p = uv * 1.5;
  // ping-pong around a well-composed moment so coverage never drifts to empty or busy
  float t = 4.0 + 2.5 * sin(u_time * 0.06);

  float e = 0.003;
  float h = field(p, t);
  vec2 g = vec2(field(p + vec2(e, 0.0), t) - h, field(p + vec2(0.0, e), t) - h) / e;
  vec2 gd = g / (length(g) + 1e-4);

  // contour bands -> tubes: s is the position across the tube, -1..1
  float v = h * 2.0 + 3.0;
  float s = (fract(v) * 2.0 - 1.0) / 0.97;
  float on = step(0.5, fract(floor(v) * 0.5));
  float body = 1.0 - smoothstep(0.86, 1.0, abs(s));
  vec3 n = normalize(vec3(gd * s * 0.95, sqrt(max(1.0 - s * s, 0.02))));

  vec3 r = reflect(vec3(0.0, 0.0, -1.0), n);
  float c = studio(r);
  float fres = pow(1.0 - n.z, 3.0);
  c = c * (0.55 + 0.6 * fres) + fres * 0.35;
  c *= body * on;

  // stay on the right; fade to pure black toward the copy and the edges
  c *= 1.0 - smoothstep(0.3, 1.0, length((uv - vec2(0.2, 0.0)) * vec2(0.8, 1.0)));

  c = c / (1.0 + c * 0.45);
  gl_FragColor = vec4(vec3(c), 1.0);
}
`

type Props = { className?: string; opacity?: number }

/** Full-size WebGL canvas with the flowing chrome. Pauses off-screen; one static frame for reduced motion. */
export function LiquidChrome({ className, opacity = 1 }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const wrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const wrap = wrapRef.current
    if (!canvas || !wrap) return

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    const small = window.innerWidth < 768
    const dpr = Math.min(window.devicePixelRatio || 1, small ? 1 : 1.5) * (small ? 0.5 : 1)
    const debug = new URLSearchParams(window.location.search).get("chromeDebug") === "1"

    const gl = canvas.getContext("webgl", { alpha: false, antialias: false, preserveDrawingBuffer: debug })
    if (!gl) return // the CSS gradient behind the canvas stays visible

    const compile = (type: number, src: string) => {
      const sh = gl.createShader(type)
      if (!sh) return null
      gl.shaderSource(sh, src)
      gl.compileShader(sh)
      if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
        console.error("LiquidChrome shader:", gl.getShaderInfoLog(sh))
        return null
      }
      return sh
    }
    const vs = compile(gl.VERTEX_SHADER, VS)
    const fs = compile(gl.FRAGMENT_SHADER, FS)
    const prog = gl.createProgram()
    if (!vs || !fs || !prog) return
    gl.attachShader(prog, vs)
    gl.attachShader(prog, fs)
    gl.linkProgram(prog)
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      console.error("LiquidChrome link:", gl.getProgramInfoLog(prog))
      return
    }
    gl.useProgram(prog)

    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer())
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW)
    const loc = gl.getAttribLocation(prog, "a_pos")
    gl.enableVertexAttribArray(loc)
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0)
    const uRes = gl.getUniformLocation(prog, "u_res")
    const uTime = gl.getUniformLocation(prog, "u_time")

    const t0 = performance.now()
    const draw = (now: number) => {
      gl.uniform2f(uRes, canvas.width, canvas.height)
      gl.uniform1f(uTime, reduce ? 0 : (now - t0) / 1000)
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
    }

    const resize = () => {
      const { width, height } = wrap.getBoundingClientRect()
      canvas.width = Math.max(1, Math.floor(width * dpr))
      canvas.height = Math.max(1, Math.floor(height * dpr))
      gl.viewport(0, 0, canvas.width, canvas.height)
      draw(performance.now()) // never leave a cleared canvas after a resize
    }
    const ro = new ResizeObserver(resize)
    ro.observe(wrap)
    resize()

    let raf = 0
    let onScreen = true
    const loop = (now: number) => {
      draw(now)
      raf = requestAnimationFrame(loop)
    }
    const sync = () => {
      const want = !reduce && onScreen && !document.hidden
      if (want && !raf) raf = requestAnimationFrame(loop)
      if (!want && raf) {
        cancelAnimationFrame(raf)
        raf = 0
      }
    }
    const io = new IntersectionObserver(([entry]) => {
      onScreen = entry?.isIntersecting ?? true
      sync()
    })
    io.observe(wrap)
    document.addEventListener("visibilitychange", sync)
    sync()

    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
      io.disconnect()
      document.removeEventListener("visibilitychange", sync)
      gl.getExtension("WEBGL_lose_context")?.loseContext()
    }
  }, [])

  return (
    <div ref={wrapRef} className={className} style={{ opacity }} aria-hidden>
      <div
        className="pointer-events-none absolute inset-0"
        style={{ background: "radial-gradient(circle at 65% 50%, #2a2a2a 0%, #000 65%)" }}
      />
      <canvas ref={canvasRef} className="relative block h-full w-full" />
    </div>
  )
}

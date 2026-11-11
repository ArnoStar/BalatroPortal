// The room's light: slow violet smoke with a blue (chips) and a rose (mult)
// current, and a glow that follows the pointer. A small WebGL canvas behind the
// page, drawn at a fraction of the screen's resolution and 30 frames a second,
// paused in a hidden tab, and a single still frame with reduced motion. Without
// WebGL the page keeps its CSS gradients.
import { useEffect, useRef, useState } from 'react';

const VERTEX = `
attribute vec2 a_pos;
void main() { gl_Position = vec4(a_pos, 0.0, 1.0); }
`;

const FRAGMENT = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
uniform vec2 u_res;
uniform float u_time;
uniform vec2 u_pointer;

float hash(vec2 p) {
  p = fract(p * vec2(234.34, 435.345));
  p += dot(p, p + 34.23);
  return fract(p.x * p.y);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}

float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  mat2 m = mat2(1.6, 1.2, -1.2, 1.6);
  for (int i = 0; i < 5; i++) {
    v += a * noise(p);
    p = m * p;
    a *= 0.5;
  }
  return v;
}

void main() {
  vec2 uv = gl_FragCoord.xy / u_res;
  vec2 p = (gl_FragCoord.xy - 0.5 * u_res) / min(u_res.x, u_res.y);
  float t = u_time * 0.045;
  vec2 q = vec2(fbm(p * 1.3 + vec2(0.0, t)), fbm(p * 1.3 + vec2(5.2, -t * 0.8)));
  vec2 r = vec2(fbm(p * 1.1 + 1.9 * q + vec2(1.7, 9.2) + t * 0.6), fbm(p * 1.1 + 1.9 * q + vec2(8.3, 2.8) - t * 0.5));
  float f = fbm(p * 1.25 + 2.1 * r);

  vec3 col = vec3(0.022, 0.018, 0.042);
  col = mix(col, vec3(0.19, 0.10, 0.46), smoothstep(0.32, 0.95, f) * 0.85);
  col = mix(col, vec3(0.05, 0.20, 0.50), smoothstep(0.42, 1.0, r.x) * 0.55);
  col = mix(col, vec3(0.48, 0.07, 0.26), smoothstep(0.5, 1.0, r.y) * 0.42);
  col += vec3(0.42, 0.32, 0.75) * pow(smoothstep(0.62, 1.0, f), 3.0) * 0.4;

  vec2 d = uv - u_pointer;
  d.x *= u_res.x / u_res.y;
  col += vec3(0.2, 0.15, 0.36) * exp(-dot(d, d) * 4.0) * 0.32;

  col *= mix(0.6, 1.0, smoothstep(0.0, 0.85, uv.y));
  vec2 v = p * vec2(0.65, 0.9);
  col *= 1.0 - 0.4 * dot(v, v);
  col += (hash(gl_FragCoord.xy + fract(u_time)) - 0.5) / 255.0;
  gl_FragColor = vec4(col, 1.0);
}
`;

/** the canvas draws at this fraction of the CSS pixels (the smoke is soft anyway) */
const SCALE = 0.4;
const FRAME_MS = 1000 / 30;

function compile(gl: WebGLRenderingContext): WebGLProgram | null {
  const shader = (type: number, source: string) => {
    const s = gl.createShader(type);
    if (!s) return null;
    gl.shaderSource(s, source);
    gl.compileShader(s);
    return gl.getShaderParameter(s, gl.COMPILE_STATUS) ? s : null;
  };
  const vs = shader(gl.VERTEX_SHADER, VERTEX);
  const fs = shader(gl.FRAGMENT_SHADER, FRAGMENT);
  const program = gl.createProgram();
  if (!vs || !fs || !program) return null;
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  return gl.getProgramParameter(program, gl.LINK_STATUS) ? program : null;
}

export function Backdrop() {
  const ref = useRef<HTMLCanvasElement>(null);
  const [on, setOn] = useState(false);

  useEffect(() => {
    const canvas = ref.current;
    const gl = canvas?.getContext('webgl', { alpha: false, antialias: false, depth: false, stencil: false, powerPreference: 'low-power' });
    if (!canvas || !gl || gl.isContextLost()) return;
    const program = compile(gl);
    if (!program) return;
    gl.useProgram(program);
    // one triangle over the whole screen
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const a_pos = gl.getAttribLocation(program, 'a_pos');
    gl.enableVertexAttribArray(a_pos);
    gl.vertexAttribPointer(a_pos, 2, gl.FLOAT, false, 0, 0);
    const u_res = gl.getUniformLocation(program, 'u_res');
    const u_time = gl.getUniformLocation(program, 'u_time');
    const u_pointer = gl.getUniformLocation(program, 'u_pointer');

    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const start = performance.now() - 20_000 - Math.random() * 60_000; // (each visit, another moment of the smoke)
    const pointer = { x: 0.5, y: 0.6, tx: 0.5, ty: 0.6 };
    let frame = 0;
    let last = 0;

    const resize = () => {
      canvas.width = Math.max(1, Math.round(window.innerWidth * SCALE));
      canvas.height = Math.max(1, Math.round(window.innerHeight * SCALE));
      gl.viewport(0, 0, canvas.width, canvas.height);
    };
    const draw = (now: number) => {
      pointer.x += (pointer.tx - pointer.x) * 0.05;
      pointer.y += (pointer.ty - pointer.y) * 0.05;
      gl.uniform2f(u_res, canvas.width, canvas.height);
      gl.uniform1f(u_time, (now - start) / 1000);
      gl.uniform2f(u_pointer, pointer.x, pointer.y);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };
    const loop = (now: number) => {
      frame = requestAnimationFrame(loop);
      if (now - last < FRAME_MS) return;
      last = now;
      draw(now);
    };
    const run = () => {
      cancelAnimationFrame(frame);
      if (still) draw(performance.now());
      else if (!document.hidden) frame = requestAnimationFrame(loop);
    };
    const on_resize = () => {
      resize();
      if (still) draw(performance.now());
    };
    const on_pointer = (e: PointerEvent) => {
      pointer.tx = e.clientX / window.innerWidth;
      pointer.ty = 1 - e.clientY / window.innerHeight;
    };
    const on_lost = (e: Event) => {
      e.preventDefault();
      cancelAnimationFrame(frame);
      setOn(false);
    };

    resize();
    run();
    setOn(true);
    window.addEventListener('resize', on_resize);
    window.addEventListener('pointermove', on_pointer, { passive: true });
    document.addEventListener('visibilitychange', run);
    canvas.addEventListener('webglcontextlost', on_lost);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', on_resize);
      window.removeEventListener('pointermove', on_pointer);
      document.removeEventListener('visibilitychange', run);
      canvas.removeEventListener('webglcontextlost', on_lost);
    };
  }, []);

  return <canvas ref={ref} className={`backdrop${on ? ' backdrop--on' : ''}`} aria-hidden />;
}

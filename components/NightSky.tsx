"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

type MoonPlacement = "corner" | "center" | "none";

const NOISE_GLSL = `
  vec3 hash33(vec3 p){ p=vec3(dot(p,vec3(127.1,311.7,74.7)),dot(p,vec3(269.5,183.3,246.1)),dot(p,vec3(113.5,271.9,124.6))); return fract(sin(p)*43758.5453123); }
  float vnoise(vec3 p){ vec3 i=floor(p),f=fract(p); f=f*f*(3.0-2.0*f);
    float a=dot(hash33(i),vec3(1))/3.0, b=dot(hash33(i+vec3(1,0,0)),vec3(1))/3.0,
          c=dot(hash33(i+vec3(0,1,0)),vec3(1))/3.0, d=dot(hash33(i+vec3(1,1,0)),vec3(1))/3.0,
          e=dot(hash33(i+vec3(0,0,1)),vec3(1))/3.0, g=dot(hash33(i+vec3(1,0,1)),vec3(1))/3.0,
          h=dot(hash33(i+vec3(0,1,1)),vec3(1))/3.0, k=dot(hash33(i+vec3(1,1,1)),vec3(1))/3.0;
    return mix(mix(mix(a,b,f.x),mix(c,d,f.x),f.y),mix(mix(e,g,f.x),mix(h,k,f.x),f.y),f.z); }
  float fbm(vec3 p){ float v=0.0,a=0.5; for(int i=0;i<5;i++){ v+=a*vnoise(p); p*=2.03; a*=0.5; } return v; }
  float voro(vec3 p){ vec3 i=floor(p),f=fract(p); float m=8.0;
    for(int x=-1;x<=1;x++)for(int y=-1;y<=1;y++)for(int z=-1;z<=1;z++){
      vec3 g=vec3(float(x),float(y),float(z)); vec3 o=hash33(i+g); vec3 r=g+o-f; m=min(m,dot(r,r)); }
    return sqrt(m); }
`;

/**
 * 月息夜景:程序化 3D 月球(无贴图,可离线)+ 眨眼星空 + 贴地萤火。
 * moon="corner" 用于欢迎页/仪表盘,"center" 用于睡眠中页(月亮做主角)。
 */
export default function NightSky({
  moon = "corner",
  fireflies = true,
}: {
  moon?: MoonPlacement;
  fireflies?: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
    camera.position.set(0, 0, 9);

    const disposables: { dispose(): void }[] = [renderer];

    /* ---- 月球 ---- */
    const moonMat = new THREE.ShaderMaterial({
      uniforms: { uLight: { value: new THREE.Vector3(-0.55, 0.35, 0.76).normalize() } },
      vertexShader: `
        varying vec3 vN; varying vec3 vP; varying vec3 vView;
        void main(){ vN = normalize(normalMatrix * normal); vP = position;
          vec4 mv = modelViewMatrix * vec4(position,1.0); vView = normalize(-mv.xyz);
          gl_Position = projectionMatrix * mv; }`,
      fragmentShader:
        NOISE_GLSL +
        `
        varying vec3 vN; varying vec3 vP; varying vec3 vView;
        uniform vec3 uLight;
        void main(){
          vec3 N = normalize(vN);
          float mare = fbm(vP * 2.2 + 5.0);
          float detail = fbm(vP * 7.0);
          float c1 = voro(vP * 3.2), c2 = voro(vP * 6.5 + 11.0);
          float pits = (1.0 - smoothstep(0.05, 0.28, c1)) * 0.5 + (1.0 - smoothstep(0.04, 0.22, c2)) * 0.35;
          float rims = (smoothstep(0.30,0.34,c1) - smoothstep(0.34,0.46,c1)) * 0.35;
          vec3 alb = mix(vec3(0.98,0.90,0.72), vec3(0.82,0.70,0.50), mare * 0.9 + detail * 0.25);
          alb -= pits * vec3(0.30,0.26,0.20);
          alb += rims * vec3(0.20,0.17,0.10);
          float diff = smoothstep(-0.12, 0.42, dot(N, normalize(uLight)));
          float fres = pow(1.0 - max(dot(N, vView), 0.0), 2.5);
          vec3 col = alb * (0.10 + 0.95 * diff);
          col += fres * vec3(1.0,0.88,0.62) * 0.35;
          col += (1.0 - diff) * vec3(0.06,0.07,0.12);
          gl_FragColor = vec4(col, 1.0);
        }`,
    });
    const moonGeo = new THREE.SphereGeometry(1.55, 96, 96);
    const moonMesh = new THREE.Mesh(moonGeo, moonMat);
    disposables.push(moonGeo, moonMat);

    const haloMat = new THREE.ShaderMaterial({
      transparent: true,
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide,
      depthWrite: false,
      uniforms: { uPulse: { value: 1 } },
      vertexShader: `varying float vF; void main(){
        vec3 n = normalize(normalMatrix * normal);
        vec4 mv = modelViewMatrix * vec4(position,1.0);
        vF = pow(1.0 + dot(n, normalize(mv.xyz)), 2.6);
        gl_Position = projectionMatrix * mv; }`,
      fragmentShader: `varying float vF; uniform float uPulse;
        void main(){ gl_FragColor = vec4(vec3(1.0,0.85,0.55) * vF * 0.55 * uPulse, vF * 0.5 * uPulse); }`,
    });
    const haloGeo = new THREE.SphereGeometry(2.05, 64, 64);
    const haloMesh = new THREE.Mesh(haloGeo, haloMat);
    moonMesh.add(haloMesh);
    disposables.push(haloGeo, haloMat);
    if (moon !== "none") scene.add(moonMesh);

    /* ---- 星空 ---- */
    const STAR_COUNT = 900;
    const pos = new Float32Array(STAR_COUNT * 3);
    const phase = new Float32Array(STAR_COUNT);
    const speed = new Float32Array(STAR_COUNT);
    const size = new Float32Array(STAR_COUNT);
    const warm = new Float32Array(STAR_COUNT);
    for (let i = 0; i < STAR_COUNT; i++) {
      const v = new THREE.Vector3().randomDirection().multiplyScalar(30 * (0.7 + Math.random() * 0.5));
      v.z = -Math.abs(v.z) - 6;
      pos.set([v.x, v.y * 0.8 + 1.5, v.z], i * 3);
      phase[i] = Math.random() * Math.PI * 2;
      speed[i] = 0.4 + Math.random() * 1.1;
      size[i] = Math.random() * 1.6 + 0.5;
      warm[i] = Math.random() < 0.16 ? 1 : 0;
    }
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    starGeo.setAttribute("aPhase", new THREE.BufferAttribute(phase, 1));
    starGeo.setAttribute("aSpeed", new THREE.BufferAttribute(speed, 1));
    starGeo.setAttribute("aSize", new THREE.BufferAttribute(size, 1));
    starGeo.setAttribute("aWarm", new THREE.BufferAttribute(warm, 1));
    const starMat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: { uTime: { value: 0 } },
      vertexShader: `attribute float aPhase; attribute float aSpeed; attribute float aSize; attribute float aWarm;
        uniform float uTime; varying float vA; varying float vW;
        void main(){ vW = aWarm;
          vA = 0.45 + 0.55 * sin(uTime * aSpeed + aPhase);
          vec4 mv = modelViewMatrix * vec4(position,1.0);
          gl_PointSize = aSize * (140.0 / -mv.z);
          gl_Position = projectionMatrix * mv; }`,
      fragmentShader: `varying float vA; varying float vW;
        void main(){ float d = length(gl_PointCoord - 0.5);
          float a = (1.0 - smoothstep(0.08, 0.5, d)) * vA;
          vec3 c = mix(vec3(0.85,0.89,1.0), vec3(1.0,0.85,0.55), vW);
          gl_FragColor = vec4(c, a); }`,
    });
    scene.add(new THREE.Points(starGeo, starMat));
    disposables.push(starGeo, starMat);

    /* ---- 萤火 ---- */
    const fmat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: { uTime: { value: 0 } },
      vertexShader: `attribute float aSeed; uniform float uTime; varying float vA;
        void main(){
          vec3 p = position;
          p.x += sin(uTime * 0.20 + aSeed) * 0.8;
          p.y += sin(uTime * 0.33 + aSeed * 1.7) * 0.45 + sin(uTime*0.11+aSeed)*0.3;
          vA = 0.35 + 0.65 * (0.5 + 0.5 * sin(uTime * 0.9 + aSeed * 3.0));
          vec4 mv = modelViewMatrix * vec4(p,1.0);
          gl_PointSize = (10.0 + 6.0 * vA) * (30.0 / -mv.z);
          gl_Position = projectionMatrix * mv; }`,
      fragmentShader: `varying float vA;
        void main(){ float d = length(gl_PointCoord - 0.5);
          float a = (1.0 - smoothstep(0.0, 0.5, d)) * vA * 0.85;
          gl_FragColor = vec4(vec3(1.0, 0.78, 0.42), a); }`,
    });
    if (fireflies) {
      const FCOUNT = 26;
      const fpos = new Float32Array(FCOUNT * 3);
      const fseed = new Float32Array(FCOUNT);
      for (let i = 0; i < FCOUNT; i++) {
        fpos.set([(Math.random() - 0.5) * 16, -2.2 - Math.random() * 1.6, -2 - Math.random() * 5], i * 3);
        fseed[i] = Math.random() * 100;
      }
      const fgeo = new THREE.BufferGeometry();
      fgeo.setAttribute("position", new THREE.BufferAttribute(fpos, 3));
      fgeo.setAttribute("aSeed", new THREE.BufferAttribute(fseed, 1));
      scene.add(new THREE.Points(fgeo, fmat));
      disposables.push(fgeo);
    }
    disposables.push(fmat);

    /* ---- 布局 / 视差 / 呼吸 ---- */
    function layout() {
      const w = innerWidth, h = innerHeight;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      if (moon === "center") {
        moonMesh.position.set(0, 1.15, 0);
        moonMesh.scale.setScalar(w < 640 ? 0.85 : 1.1);
      } else if (w < 640) {
        moonMesh.position.set(0.4, 2.6, 0);
        moonMesh.scale.setScalar(0.72);
      } else {
        moonMesh.position.set(3.1, 1.35, 0);
        moonMesh.scale.setScalar(1);
      }
    }
    layout();

    let px = 0, py = 0;
    const onPointer = (e: PointerEvent) => {
      px = (e.clientX / innerWidth - 0.5) * 2;
      py = (e.clientY / innerHeight - 0.5) * 2;
    };
    addEventListener("resize", layout);
    addEventListener("pointermove", onPointer);

    const clock = new THREE.Clock();
    let raf = 0;
    const lookAt = moon === "center" ? new THREE.Vector3(0, 0.6, 0) : new THREE.Vector3(0.8, 0.4, 0);

    function frame() {
      const t = clock.getElapsedTime();
      starMat.uniforms.uTime.value = t;
      fmat.uniforms.uTime.value = t;
      const ph = (t % 10) / 10; // 呼吸:吸4s 呼6s
      const breath = ph < 0.4
        ? 0.5 - 0.5 * Math.cos((ph / 0.4) * Math.PI)
        : 0.5 + 0.5 * Math.cos(((ph - 0.4) / 0.6) * Math.PI);
      haloMat.uniforms.uPulse.value = 0.72 + 0.38 * breath;
      moonMesh.rotation.y = t * 0.012;
      camera.position.x += (px * 0.35 - camera.position.x) * 0.03;
      camera.position.y += (-py * 0.22 - camera.position.y) * 0.03;
      camera.lookAt(lookAt);
      renderer.render(scene, camera);
      if (!reduced) raf = requestAnimationFrame(frame);
    }
    if (reduced) {
      camera.lookAt(lookAt);
      renderer.render(scene, camera);
    } else {
      raf = requestAnimationFrame(frame);
    }

    return () => {
      cancelAnimationFrame(raf);
      removeEventListener("resize", layout);
      removeEventListener("pointermove", onPointer);
      for (const d of disposables) d.dispose();
    };
  }, [moon, fireflies]);

  return <canvas ref={canvasRef} className="pointer-events-none fixed inset-0 -z-10 h-full w-full" aria-hidden />;
}

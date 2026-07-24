"use client";

import { useEffect, useRef, useState } from "react";

/**
 * 程序化助眠声音:Web Audio 实时合成,无音频文件、可离线。
 * 成人:白噪 / 海浪 / 冥想钟磬;儿童:摇篮轻音 / 白噪(spec:儿童剔除冥想)。
 */
type TrackId = "noise" | "waves" | "bell" | "lullaby";

const TRACKS: Record<TrackId, { name: string; note: string }> = {
  noise: { name: "静谧白噪", note: "均匀的沙沙声" },
  waves: { name: "海浪轻语", note: "缓慢的潮汐起伏" },
  bell: { name: "冥想钟磬", note: "悠长的泛音" },
  lullaby: { name: "摇篮轻音", note: "柔和的和声" },
};

function makeNoiseBuffer(ctx: AudioContext) {
  const buf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  return buf;
}

export default function SleepAudio({ userType }: { userType: "adult" | "child" }) {
  const [playing, setPlaying] = useState<TrackId | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const nodesRef = useRef<AudioNode[]>([]);

  const available: TrackId[] =
    userType === "child" ? ["lullaby", "noise"] : ["noise", "waves", "bell"];

  function stop() {
    for (const n of nodesRef.current) {
      try {
        if (n instanceof AudioScheduledSourceNode) n.stop();
        n.disconnect();
      } catch {}
    }
    nodesRef.current = [];
    setPlaying(null);
  }

  useEffect(() => () => { stop(); ctxRef.current?.close(); }, []);

  function play(id: TrackId) {
    if (playing === id) return stop();
    stop();
    const ctx = (ctxRef.current ??= new AudioContext());
    if (ctx.state === "suspended") ctx.resume();
    const master = ctx.createGain();
    master.gain.value = 0.001;
    master.gain.exponentialRampToValueAtTime(0.5, ctx.currentTime + 1.5);
    master.connect(ctx.destination);
    const nodes: AudioNode[] = [master];

    if (id === "noise" || id === "waves") {
      const src = ctx.createBufferSource();
      src.buffer = makeNoiseBuffer(ctx);
      src.loop = true;
      const lp = ctx.createBiquadFilter();
      lp.type = "lowpass";
      lp.frequency.value = id === "noise" ? 850 : 480;
      const g = ctx.createGain();
      g.gain.value = 0.32;
      src.connect(lp).connect(g).connect(master);
      if (id === "waves") {
        const lfo = ctx.createOscillator();
        lfo.frequency.value = 0.08;
        const depth = ctx.createGain();
        depth.gain.value = 0.14;
        lfo.connect(depth).connect(g.gain);
        lfo.start();
        nodes.push(lfo, depth);
      }
      src.start();
      nodes.push(src, lp, g);
    } else if (id === "bell") {
      // 悠长钟磬:低频正弦 + 泛音,缓慢颤音
      for (const [freq, vol] of [[196, 0.16], [392, 0.06], [588, 0.028]] as const) {
        const osc = ctx.createOscillator();
        osc.frequency.value = freq;
        const g = ctx.createGain();
        g.gain.value = vol;
        osc.connect(g).connect(master);
        osc.start();
        nodes.push(osc, g);
      }
      const trem = ctx.createOscillator();
      trem.frequency.value = 0.15;
      const tg = ctx.createGain();
      tg.gain.value = 0.12;
      trem.connect(tg).connect(master.gain);
      trem.start();
      nodes.push(trem, tg);
    } else {
      // 摇篮轻音:柔和大三和弦 + 慢揉音
      for (const [freq, vol] of [[262, 0.1], [330, 0.07], [392, 0.06], [524, 0.03]] as const) {
        const osc = ctx.createOscillator();
        osc.type = "triangle";
        osc.frequency.value = freq;
        const vib = ctx.createOscillator();
        vib.frequency.value = 0.4;
        const vg = ctx.createGain();
        vg.gain.value = 1.6;
        vib.connect(vg).connect(osc.frequency);
        vib.start();
        const g = ctx.createGain();
        g.gain.value = vol;
        osc.connect(g).connect(master);
        osc.start();
        nodes.push(osc, vib, vg, g);
      }
    }

    nodesRef.current = nodes;
    setPlaying(id);
  }

  return (
    <div>
      <p className="mb-3 text-[11px] tracking-[0.28em] text-cream-dim">助眠声音</p>
      <div className="flex flex-wrap gap-2.5">
        {available.map((id) => (
          <button
            key={id}
            onClick={() => play(id)}
            className={`rounded-full border px-5 py-2.5 text-[12.5px] transition-all ${
              playing === id
                ? "border-moon/60 bg-moon/15 text-moon"
                : "border-hair text-cream-dim hover:border-moon/40 hover:text-cream"
            }`}
          >
            {TRACKS[id].name}
            <span className="ml-2 opacity-60">{playing === id ? "播放中" : TRACKS[id].note}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

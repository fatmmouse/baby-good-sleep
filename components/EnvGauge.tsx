"use client";

import { useState } from "react";

export interface GaugeEnv {
  tempC: number;
  humidityPct: number;
  lightLux: number;
}

type MetricKey = "temp" | "humidity" | "light";

/**
 * 单圆环境仪表:深色内盘 + 旋转呼吸的彩色光晕 + 月色进度弧。
 * 关键布局全部用内联样式锁定,不依赖原子类生成,避免跨浏览器散架。
 */
const METRICS: {
  key: MetricKey;
  label: string;
  unit: string;
  min: number;
  max: number;
  read: (env: GaugeEnv) => number;
  fmt: (v: number) => string;
  glow: [string, string, string];
}[] = [
  {
    key: "temp",
    label: "温度",
    unit: "℃",
    min: 12,
    max: 34,
    read: (env) => env.tempC,
    fmt: (v) => v.toFixed(1),
    glow: ["rgba(240, 164, 96, 0.85)", "rgba(214, 120, 60, 0.65)", "rgba(245, 190, 120, 0.5)"],
  },
  {
    key: "humidity",
    label: "湿度",
    unit: "%",
    min: 20,
    max: 90,
    read: (env) => env.humidityPct,
    fmt: (v) => String(Math.round(v)),
    glow: ["rgba(110, 210, 200, 0.8)", "rgba(70, 170, 180, 0.6)", "rgba(150, 225, 200, 0.45)"],
  },
  {
    key: "light",
    label: "光照",
    unit: "lux",
    min: 0,
    max: 600,
    read: (env) => env.lightLux,
    fmt: (v) => String(Math.round(v)),
    glow: ["rgba(245, 223, 174, 0.85)", "rgba(230, 190, 120, 0.6)", "rgba(250, 236, 200, 0.45)"],
  },
];

const SIZE = 300;

/* 光晕斑块:沿边缘分布,随父层慢转,各自按不同节奏呼吸 */
const BLOBS = [
  { size: 140, top: "-8%", left: "28%", dur: 5.6, delay: 0 },
  { size: 180, top: "26%", left: "60%", dur: 7.2, delay: -2.1 },
  { size: 140, top: "56%", left: "-4%", dur: 6.4, delay: -3.8 },
  { size: 110, top: "64%", left: "46%", dur: 8.0, delay: -1.2 },
];

const R = 45;
const CIRC = 2 * Math.PI * R;

export default function EnvGauge({ env }: { env: GaugeEnv | null }) {
  const [active, setActive] = useState<MetricKey>("temp");
  const metric = METRICS.find((m) => m.key === active)!;
  const value = env ? metric.read(env) : null;
  const frac =
    value === null ? 0 : Math.min(1, Math.max(0, (value - metric.min) / (metric.max - metric.min)));

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
      <div style={{ position: "relative", width: SIZE, height: SIZE }}>
        {/* 光晕层 */}
        <div
          className="gauge-anim"
          style={{
            position: "absolute",
            inset: 0,
            animation: "gauge-spin 26s linear infinite",
          }}
        >
          {BLOBS.map((b, i) => (
            <div
              key={i}
              className="gauge-anim"
              style={{
                position: "absolute",
                width: b.size,
                height: b.size,
                top: b.top,
                left: b.left,
                borderRadius: "50%",
                filter: "blur(36px)",
                background: `radial-gradient(circle, ${metric.glow[i % 3]}, transparent 70%)`,
                animation: `gauge-breath ${b.dur}s ease-in-out ${b.delay}s infinite`,
              }}
            />
          ))}
        </div>

        {/* 进度弧:数值在显示区间内的位置 */}
        <svg
          viewBox="0 0 100 100"
          aria-hidden
          style={{ position: "absolute", inset: 12, transform: "rotate(-90deg)" }}
        >
          <circle cx="50" cy="50" r={R} fill="none" stroke="rgba(243,234,216,0.10)" strokeWidth="1.6" />
          <circle
            cx="50" cy="50" r={R} fill="none"
            stroke="var(--moon)" strokeWidth="2.4" strokeLinecap="round"
            strokeDasharray={`${frac * CIRC} ${CIRC}`}
            style={{ transition: "stroke-dasharray 0.7s ease", opacity: 0.92 }}
          />
        </svg>

        {/* 深色内盘 */}
        <div
          style={{
            position: "absolute",
            inset: 36,
            display: "grid",
            placeItems: "center",
            borderRadius: "50%",
            border: "1px solid rgba(255,255,255,0.06)",
            background: "rgba(9, 11, 22, 0.95)",
            boxShadow: "inset 0 2px 24px rgba(0,0,0,0.6)",
            textAlign: "center",
          }}
        >
          <div>
            <div className="serif [font-variant-numeric:tabular-nums]" style={{ fontSize: 50, lineHeight: 1, letterSpacing: "0.02em" }}>
              {value === null ? "--" : metric.fmt(value)}
              <span style={{ marginLeft: 6, fontSize: 15, color: "var(--cream-dim)" }}>{metric.unit}</span>
            </div>
            <div style={{ marginTop: 12, fontSize: 11, letterSpacing: "0.34em", textIndent: "0.34em", color: "var(--cream-dim)" }}>
              {metric.label}
            </div>
          </div>
        </div>
      </div>

      {/* 切换器 */}
      <div className="glass" style={{ marginTop: 32, display: "flex", alignItems: "center", gap: 4, borderRadius: 999, padding: 4 }}>
        {METRICS.map((m) => (
          <button
            key={m.key}
            onClick={() => setActive(m.key)}
            aria-pressed={m.key === active}
            style={{
              borderRadius: 999,
              padding: "8px 20px",
              fontSize: 12.5,
              letterSpacing: "0.18em",
              transition: "color 0.2s, background 0.2s",
              background: m.key === active ? "rgba(255,255,255,0.09)" : "transparent",
              color: m.key === active ? "var(--cream)" : "var(--cream-dim)",
            }}
          >
            {m.label}
          </button>
        ))}
      </div>
    </div>
  );
}

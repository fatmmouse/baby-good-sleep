"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import NightSky from "@/components/NightSky";
import TopNav from "@/components/TopNav";
import type { SessionSummary } from "@/lib/report/summarize";

interface VoiceRow {
  rawText: string;
  mode: "hardcoded" | "natural";
  parsedJson: string;
  at: string;
}

function fmtTime(iso: string) {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export default function ReportClient({
  summary,
  profileName,
  voices,
}: {
  summary: SessionSummary;
  profileName: string;
  voices: VoiceRow[];
}) {
  const [toast, setToast] = useState("");
  const [saving, setSaving] = useState(false);

  const chartData = useMemo(
    () =>
      summary.envSeries.map((p) => ({
        time: fmtTime(p.t),
        tempC: p.tempC,
        humidityPct: p.humidityPct,
      })),
    [summary.envSeries],
  );

  const totalStage = summary.ringStages.reduce((s, x) => s + x.minutes, 0) || 1;
  const durationText =
    summary.durationMin >= 60
      ? `${Math.floor(summary.durationMin / 60)} 小时 ${summary.durationMin % 60} 分`
      : `${summary.durationMin} 分钟`;

  async function saveAsPref() {
    setSaving(true);
    const temps = summary.envSeries.map((p) => p.tempC);
    const hums = summary.envSeries.map((p) => p.humidityPct);
    const avgT = temps.length ? temps.reduce((a, b) => a + b, 0) / temps.length : 23.5;
    const avgH = hums.length ? hums.reduce((a, b) => a + b, 0) / hums.length : 50;
    const res = await fetch("/api/prefs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: `本次环境 ${fmtTime(summary.startedAt)}`,
        tempMin: Math.round((avgT - 1.5) * 10) / 10,
        tempMax: Math.round((avgT + 1.5) * 10) / 10,
        humidityMin: Math.max(20, Math.round(avgH - 10)),
        humidityMax: Math.min(90, Math.round(avgH + 10)),
        lightBrightness: 15,
        lightColorTemp: "warm",
      }),
    });
    setSaving(false);
    setToast(res.ok ? "已保存为新的睡眠方案" : "保存失败,请重试");
    setTimeout(() => setToast(""), 4000);
  }

  const stageColors: Record<string, string> = {
    浅睡: "#7da2e8",
    深睡: "#4a5fa8",
    快速眼动: "#f5dfae",
  };

  return (
    <main className="relative min-h-screen overflow-x-hidden px-5">
      <NightSky />
      <TopNav />

      <div className="glass mx-auto mb-24 mt-28 w-full max-w-2xl rounded-3xl px-7 py-10 md:mt-32 md:px-10">
        <p className="text-[12px] tracking-[0.34em] text-cream-dim">睡眠报告 · {profileName}</p>
        <h1 className="serif mt-3 text-[34px] font-semibold tracking-[0.04em]">
          这一夜,睡了 {durationText}
        </h1>
        <p className="mt-2 text-[13px] text-cream-dim">
          {fmtTime(summary.startedAt)} 入夜 · {fmtTime(summary.endedAt)} 醒来
        </p>

        {/* 关键数字 */}
        <div className="mt-9 flex border-y border-hair">
          {[
            { label: "升降温调节", value: summary.climateAdjustCount, unit: "次" },
            { label: "灯光调节", value: summary.lightAdjustCount, unit: "次" },
            { label: "湿度调节", value: summary.humidityAdjustCount, unit: "次" },
            { label: "语音指令", value: summary.voiceCount, unit: "条" },
          ].map((s, i) => (
            <div key={s.label} className={`flex-1 py-5 text-center ${i > 0 ? "border-l border-hair" : ""}`}>
              <div className="serif text-[28px] [font-variant-numeric:tabular-nums]">
                {s.value}
                <span className="ml-1 text-[12px] text-cream-dim">{s.unit}</span>
              </div>
              <div className="mt-1 text-[10.5px] tracking-[0.2em] text-cream-dim">{s.label}</div>
            </div>
          ))}
        </div>

        {/* 环境曲线 */}
        {chartData.length > 1 && (
          <>
            <p className="mb-3 mt-10 text-[11px] tracking-[0.28em] text-cream-dim">夜间环境 · 温度与湿度</p>
            <div className="h-52 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 6, right: 4, left: -18, bottom: 0 }}>
                  <defs>
                    <linearGradient id="rt" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#f5dfae" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#f5dfae" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="rh" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#7da2e8" stopOpacity={0.25} />
                      <stop offset="100%" stopColor="#7da2e8" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="time" tick={{ fill: "#b9ad95", fontSize: 10 }} tickLine={false} axisLine={{ stroke: "rgba(243,234,216,.16)" }} minTickGap={40} />
                  <YAxis yAxisId="t" domain={["dataMin - 1", "dataMax + 1"]} tick={{ fill: "#b9ad95", fontSize: 10 }} tickLine={false} axisLine={false} />
                  <YAxis yAxisId="h" orientation="right" domain={[0, 100]} hide />
                  <Tooltip
                    contentStyle={{ background: "rgba(16,16,40,.92)", border: "1px solid rgba(243,234,216,.16)", borderRadius: 12, fontSize: 12, color: "#f3ead8" }}
                    formatter={(value, name) => [
                      name === "tempC" ? `${Number(value).toFixed(1)}℃` : `${Math.round(Number(value))}%`,
                      name === "tempC" ? "温度" : "湿度",
                    ]}
                  />
                  <Area yAxisId="h" type="monotone" dataKey="humidityPct" stroke="#7da2e8" strokeWidth={1.2} fill="url(#rh)" isAnimationActive={false} dot={false} />
                  <Area yAxisId="t" type="monotone" dataKey="tempC" stroke="#f5dfae" strokeWidth={1.6} fill="url(#rt)" isAnimationActive={false} dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </>
        )}

        {/* 戒指睡眠分期 */}
        <p className="mb-3 mt-10 text-[11px] tracking-[0.28em] text-cream-dim">睡眠分期 · 来自睡眠戒指</p>
        <div className="flex h-9 w-full overflow-hidden rounded-xl border border-hair">
          {summary.ringStages.map((s) => (
            <div
              key={s.stage}
              className="flex items-center justify-center text-[10.5px] text-night-0/80"
              style={{ width: `${(s.minutes / totalStage) * 100}%`, background: stageColors[s.stage] }}
            >
              {s.stage}
            </div>
          ))}
        </div>
        <div className="mt-2 flex gap-5 text-[11px] text-cream-dim">
          {summary.ringStages.map((s) => (
            <span key={s.stage}>{s.stage} {s.minutes} 分</span>
          ))}
        </div>

        {/* 语音指令记录 */}
        <p className="mb-3 mt-10 text-[11px] tracking-[0.28em] text-cream-dim">语音指令记录</p>
        {voices.length === 0 ? (
          <p className="text-[13px] text-cream-dim">这一夜没有语音指令,一切都由系统安静完成。</p>
        ) : (
          <div>
            {voices.map((v, i) => (
              <div key={i} className="border-b border-dashed border-hair py-3">
                <div className="flex items-baseline justify-between">
                  <span className="text-[13.5px]">「{v.rawText}」</span>
                  <span className="text-[11px] text-cream-dim">
                    {fmtTime(v.at)} · {v.mode === "hardcoded" ? "快捷指令" : "AI 理解"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 操作 */}
        <div className="mt-12 flex flex-col gap-3 sm:flex-row">
          <button
            onClick={saveAsPref}
            disabled={saving}
            className="btn-moon flex-1 rounded-2xl py-4 text-[13.5px] font-semibold tracking-[0.24em] disabled:opacity-70"
          >
            {saving ? "正在保存" : "把本次环境存为睡眠方案"}
          </button>
          <a
            href="/dashboard"
            className="flex-1 rounded-2xl border border-hair py-4 text-center text-[13.5px] tracking-[0.24em] text-cream-dim transition-colors hover:border-moon/40 hover:text-cream"
          >
            回到仪表盘
          </a>
        </div>
      </div>

      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="glass fixed left-1/2 top-24 z-50 -translate-x-1/2 rounded-full px-6 py-3 text-[13px] text-cream"
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}

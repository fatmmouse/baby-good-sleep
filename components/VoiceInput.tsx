"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Keyboard, Mic, Mic2, Send } from "lucide-react";

const QUICK_COMMANDS = ["关灯", "开夜灯", "调高温度"];

/* 浏览器语音识别(Chrome/Safari 的 webkitSpeechRecognition;Firefox 系不支持,走文字回退) */
interface SpeechRecognitionLike {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

function getSpeechRecognition(): (new () => SpeechRecognitionLike) | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as Record<string, unknown>;
  return (w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null) as (new () => SpeechRecognitionLike) | null;
}

export default function VoiceInput({
  sessionId,
  compact = false,
}: {
  sessionId?: string;
  compact?: boolean;
}) {
  const [text, setText] = useState("");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [listening, setListening] = useState(false);
  const [textMode, setTextMode] = useState(false);
  const [speechOk, setSpeechOk] = useState(false);
  const recRef = useRef<SpeechRecognitionLike | null>(null);

  useEffect(() => {
    setSpeechOk(getSpeechRecognition() !== null);
    return () => recRef.current?.abort();
  }, []);

  async function submit(event?: FormEvent, commandText = text) {
    event?.preventDefault();
    const normalized = commandText.trim();
    if (!normalized || pending) return;

    setPending(true);
    setMessage("");
    try {
      const response = await fetch("/api/voice/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: normalized, sessionId }),
      });
      const data = await response.json().catch(() => ({}));
      setMessage(response.ok ? data.message : data.error || "指令未成功，请再试一次");
      if (response.ok) setText("");
    } catch {
      setMessage("连接不稳定，请再试一次");
    } finally {
      setPending(false);
    }
  }

  function toggleListen() {
    if (listening) {
      recRef.current?.stop();
      return;
    }
    const SR = getSpeechRecognition();
    if (!SR) {
      setTextMode(true);
      setMessage("当前浏览器不支持语音识别，可直接输入文字");
      return;
    }
    const rec = new SR();
    rec.lang = "zh-CN";
    rec.interimResults = false;
    rec.continuous = false;
    rec.onresult = (e) => {
      const transcript = Array.from({ length: e.results.length }, (_, i) => e.results[i][0].transcript).join("");
      if (transcript.trim()) submit(undefined, transcript);
    };
    rec.onend = () => setListening(false);
    rec.onerror = () => {
      setListening(false);
      setMessage("没有听清，再试一次");
    };
    recRef.current = rec;
    setMessage("");
    setListening(true);
    rec.start();
  }

  /* 睡眠页:圆形语音按键为主,文字输入按需展开 */
  if (compact) {
    return (
      <section className="flex w-full max-w-sm flex-col items-center">
        <div className="mb-5 flex items-center justify-center gap-2 text-[11px] tracking-[0.26em] text-cream-dim">
          <Mic2 size={14} strokeWidth={1.4} />
          语音指令
        </div>

        <button
          type="button"
          onClick={toggleListen}
          disabled={pending}
          aria-label={listening ? "停止聆听" : "开始说话"}
          className={`relative grid h-[76px] w-[76px] place-items-center rounded-full border transition-colors disabled:opacity-50 ${
            listening
              ? "border-moon/70 bg-moon/20 text-moon"
              : "glass text-cream-dim hover:border-moon/45 hover:text-cream"
          }`}
        >
          {listening && (
            <motion.span
              aria-hidden
              className="absolute inset-0 rounded-full border border-moon/50"
              animate={{ scale: [1, 1.45], opacity: [0.6, 0] }}
              transition={{ duration: 1.6, repeat: Infinity, ease: "easeOut" }}
            />
          )}
          <Mic size={26} strokeWidth={1.5} />
        </button>

        <p aria-live="polite" className="mt-3.5 min-h-5 text-center text-[11.5px] leading-5 text-cream-dim">
          {listening
            ? "正在聆听，说出你的指令"
            : pending
              ? "正在执行"
              : message || (speechOk ? "点击说话" : "点击展开文字输入")}
        </p>

        <AnimatePresence initial={false}>
          {textMode && (
            <motion.form
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
              onSubmit={(event) => submit(event)}
              className="mt-3 w-full overflow-hidden"
            >
              <div className="glass flex items-center rounded-2xl p-1.5">
                <input
                  value={text}
                  onChange={(event) => setText(event.target.value)}
                  maxLength={200}
                  placeholder="关灯，或者把房间调暖一点"
                  aria-label="输入语音指令"
                  className="min-w-0 flex-1 bg-transparent px-3 py-2 text-[12.5px] text-cream outline-none placeholder:text-cream-dim/55"
                />
                <button
                  type="submit"
                  disabled={pending || !text.trim()}
                  aria-label="执行指令"
                  className="rounded-xl bg-moon/15 p-2.5 text-moon transition-colors hover:bg-moon/25 disabled:opacity-30"
                >
                  <Send size={15} strokeWidth={1.6} />
                </button>
              </div>
            </motion.form>
          )}
        </AnimatePresence>

        <button
          type="button"
          onClick={() => setTextMode((v) => !v)}
          className="mt-3 flex items-center gap-1.5 text-[10.5px] tracking-[0.14em] text-cream-dim/70 transition-colors hover:text-cream"
        >
          <Keyboard size={12} strokeWidth={1.5} />
          {textMode ? "收起文字输入" : "改用文字输入"}
        </button>
      </section>
    );
  }

  /* 仪表盘:文字条框 + 快捷指令 */
  return (
    <section>
      <div className="mb-3 flex items-center gap-2 text-[11px] tracking-[0.26em] text-cream-dim">
        <Mic2 size={14} strokeWidth={1.4} />
        语音指令
        <span className="tracking-normal opacity-60">· 可直接输入演示</span>
      </div>
      <form
        onSubmit={(event) => submit(event)}
        className="glass flex items-center rounded-2xl p-1.5"
      >
        <input
          value={text}
          onChange={(event) => setText(event.target.value)}
          maxLength={200}
          placeholder="关灯，或者把房间调暖一点"
          aria-label="输入语音指令"
          className="min-w-0 flex-1 bg-transparent px-3 py-2 text-[12.5px] text-cream outline-none placeholder:text-cream-dim/55"
        />
        <button
          type="submit"
          disabled={pending || !text.trim()}
          aria-label="执行指令"
          className="rounded-xl bg-moon/15 p-2.5 text-moon transition-colors hover:bg-moon/25 disabled:opacity-30"
        >
          <Send size={15} strokeWidth={1.6} />
        </button>
      </form>
      <div className="mt-2.5 flex flex-wrap gap-2">
        {QUICK_COMMANDS.map((command) => (
          <button
            key={command}
            type="button"
            disabled={pending}
            onClick={() => submit(undefined, command)}
            className="rounded-full border border-hair px-3 py-1.5 text-[10.5px] text-cream-dim transition-colors hover:border-moon/35 hover:text-cream disabled:opacity-40"
          >
            {command}
          </button>
        ))}
      </div>
      {message && (
        <motion.p
          initial={{ opacity: 0, y: -3 }}
          animate={{ opacity: 1, y: 0 }}
          aria-live="polite"
          className="mt-2.5 text-[11.5px] leading-5 text-cream-dim"
        >
          {message}
        </motion.p>
      )}
    </section>
  );
}

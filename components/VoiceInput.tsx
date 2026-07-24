"use client";

import { FormEvent, useState } from "react";
import { motion } from "framer-motion";
import { Mic2, Send } from "lucide-react";

const QUICK_COMMANDS = ["关灯", "开夜灯", "调高温度"];

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

  return (
    <section className={compact ? "w-full max-w-sm text-left" : ""}>
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
      {!compact && (
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
      )}
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

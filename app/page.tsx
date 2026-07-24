"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Moon, User, Baby } from "lucide-react";

type UserType = "adult" | "child";

export default function WelcomePage() {
  const router = useRouter();
  const [userType, setUserType] = useState<UserType>("adult");
  const [nickname, setNickname] = useState("");
  const [childAge, setChildAge] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function start() {
    if (!nickname.trim()) {
      setError("先给自己起个昵称吧");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nickname: nickname.trim(),
          userType,
          childAge: userType === "child" ? Number(childAge) || null : null,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "进入失败,请重试");
      }
      router.push("/dashboard");
    } catch (e) {
      setError(e instanceof Error ? e.message : "进入失败,请重试");
      setLoading(false);
    }
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[radial-gradient(120%_120%_at_50%_0%,#1b2a6b_0%,#0a1230_60%,#060b20_100%)] text-white">
      <div className="pointer-events-none absolute inset-0 opacity-40 [background:radial-gradient(60%_40%_at_70%_20%,rgba(59,109,246,0.35),transparent)]" />
      <div className="relative mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-6">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="w-full"
        >
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 backdrop-blur">
              <Moon className="h-7 w-7 text-blue-200" />
            </div>
            <h1 className="text-2xl font-semibold tracking-tight">宝宝爱睡觉</h1>
            <p className="mt-2 text-sm text-blue-200/80">你的主动式睡眠搭子</p>
          </div>

          <div className="rounded-3xl bg-white/[0.06] p-6 shadow-2xl ring-1 ring-white/10 backdrop-blur-xl">
            <label className="mb-2 block text-xs text-blue-200/70">选择使用者</label>
            <div className="mb-5 grid grid-cols-2 gap-3">
              <TypeButton
                active={userType === "adult"}
                onClick={() => setUserType("adult")}
                icon={<User className="h-5 w-5" />}
                label="成人"
              />
              <TypeButton
                active={userType === "child"}
                onClick={() => setUserType("child")}
                icon={<Baby className="h-5 w-5" />}
                label="儿童"
              />
            </div>

            <label className="mb-2 block text-xs text-blue-200/70">昵称</label>
            <input
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="怎么称呼你?"
              className="mb-4 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm outline-none placeholder:text-white/30 focus:border-blue-400/60"
            />

            {userType === "child" && (
              <div className="mb-4">
                <label className="mb-2 block text-xs text-blue-200/70">宝宝年龄(岁)</label>
                <input
                  value={childAge}
                  onChange={(e) => setChildAge(e.target.value.replace(/\D/g, ""))}
                  inputMode="numeric"
                  placeholder="例如 3"
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm outline-none placeholder:text-white/30 focus:border-blue-400/60"
                />
              </div>
            )}

            {error && <p className="mb-3 text-sm text-rose-300">{error}</p>}

            <button
              onClick={start}
              disabled={loading}
              className="w-full rounded-xl bg-blue-500 py-3 text-sm font-medium transition hover:bg-blue-400 disabled:opacity-60"
            >
              {loading ? "正在进入…" : "开始"}
            </button>
          </div>

          <p className="mt-6 text-center text-xs text-blue-200/50">
            无需注册,一键进入即可开始
          </p>
        </motion.div>
      </div>
    </main>
  );
}

function TypeButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center gap-2 rounded-xl border py-4 text-sm transition ${
        active
          ? "border-blue-400/70 bg-blue-500/20 text-white"
          : "border-white/10 bg-white/5 text-blue-200/70 hover:bg-white/10"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

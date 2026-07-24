import { redirect } from "next/navigation";
import { getUserId } from "@/lib/session-cookie";
import { db } from "@/lib/db";

export default async function DashboardPage() {
  const uid = await getUserId();
  if (!uid) redirect("/");

  const user = await db.user.findUnique({
    where: { id: uid },
    include: { prefs: true },
  });
  if (!user) redirect("/");

  return (
    <main className="min-h-screen bg-background px-6 py-10">
      <div className="mx-auto max-w-2xl">
        <p className="text-sm text-muted">
          {user.userType === "child" ? "儿童模式" : "成人模式"}
        </p>
        <h1 className="mt-1 text-2xl font-semibold text-foreground">
          晚上好,{user.nickname}
        </h1>
        <p className="mt-4 text-sm text-muted">
          已为你预置 {user.prefs.length} 套睡眠方案:
          {user.prefs.map((p) => p.name).join("、")}
        </p>
        <div className="mt-8 rounded-2xl border border-border bg-card p-6 text-sm text-muted">
          仪表盘功能建设中(任务 6):实时环境、方案卡、语音指令、开始睡眠、演示造场。
        </div>
      </div>
    </main>
  );
}

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUserId } from "@/lib/session-cookie";

export async function GET() {
  const uid = await getUserId();
  if (!uid) return NextResponse.json({ error: "未登录" }, { status: 401 });
  const prefs = await db.preferenceProfile.findMany({
    where: { userId: uid },
    orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
  });
  return NextResponse.json({ prefs });
}

/** 新建偏好模板(含「把本次环境存为模板」) */
export async function POST(req: Request) {
  const uid = await getUserId();
  if (!uid) return NextResponse.json({ error: "未登录" }, { status: 401 });
  const b = await req.json().catch(() => ({}));
  const name = typeof b?.name === "string" ? b.name.trim() : "";
  if (!name) return NextResponse.json({ error: "名称不能为空" }, { status: 400 });

  const pref = await db.preferenceProfile.create({
    data: {
      userId: uid,
      name,
      tempMin: Number(b.tempMin) || 22,
      tempMax: Number(b.tempMax) || 25,
      humidityMin: Number(b.humidityMin) || 40,
      humidityMax: Number(b.humidityMax) || 60,
      lightBrightness: Math.min(100, Math.max(0, Number(b.lightBrightness) || 15)),
      lightColorTemp: b.lightColorTemp === "cool" ? "cool" : "warm",
      isDefault: false,
    },
  });
  return NextResponse.json({ pref });
}

export async function PATCH(req: Request) {
  const uid = await getUserId();
  if (!uid) return NextResponse.json({ error: "未登录" }, { status: 401 });
  const b = await req.json().catch(() => ({}));
  const existing = await db.preferenceProfile.findUnique({ where: { id: b?.id } });
  if (!existing || existing.userId !== uid) {
    return NextResponse.json({ error: "方案不存在" }, { status: 404 });
  }
  const pref = await db.preferenceProfile.update({
    where: { id: existing.id },
    data: {
      name: typeof b.name === "string" && b.name.trim() ? b.name.trim() : existing.name,
      tempMin: Number.isFinite(Number(b.tempMin)) ? Number(b.tempMin) : existing.tempMin,
      tempMax: Number.isFinite(Number(b.tempMax)) ? Number(b.tempMax) : existing.tempMax,
      humidityMin: Number.isFinite(Number(b.humidityMin)) ? Number(b.humidityMin) : existing.humidityMin,
      humidityMax: Number.isFinite(Number(b.humidityMax)) ? Number(b.humidityMax) : existing.humidityMax,
      lightBrightness: Number.isFinite(Number(b.lightBrightness))
        ? Math.min(100, Math.max(0, Number(b.lightBrightness)))
        : existing.lightBrightness,
      lightColorTemp: b.lightColorTemp === "cool" || b.lightColorTemp === "warm"
        ? b.lightColorTemp
        : existing.lightColorTemp,
    },
  });
  return NextResponse.json({ pref });
}

export async function DELETE(req: Request) {
  const uid = await getUserId();
  if (!uid) return NextResponse.json({ error: "未登录" }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  const existing = id ? await db.preferenceProfile.findUnique({ where: { id } }) : null;
  if (!existing || existing.userId !== uid) {
    return NextResponse.json({ error: "方案不存在" }, { status: 404 });
  }
  if (existing.isDefault) {
    return NextResponse.json({ error: "默认方案不可删除" }, { status: 400 });
  }
  const used = await db.sleepSession.count({ where: { profileId: existing.id } });
  if (used > 0) {
    return NextResponse.json({ error: "方案已被睡眠记录引用,暂不可删除" }, { status: 400 });
  }
  await db.preferenceProfile.delete({ where: { id: existing.id } });
  return NextResponse.json({ ok: true });
}

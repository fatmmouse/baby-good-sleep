import { NextResponse } from "next/server";
import { getDriver, SimDriver } from "@/lib/hardware";

/** 仪表盘实时环境:当前读数 + 灯态 + 调温目标 */
export async function GET() {
  const driver = getDriver();
  const env = await driver.readEnvironment();
  const sim = driver instanceof SimDriver ? driver : null;
  return NextResponse.json({
    env,
    light: sim?.lightState ?? null,
    targetTempC: sim?.climateTarget ?? null,
  });
}

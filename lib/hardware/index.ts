import type { HardwareDriver } from "./driver";
import { SimDriver } from "./sim";

const g = globalThis as unknown as { __hardwareDriver?: HardwareDriver };

/** 进程内单例(globalThis 缓存,避免 dev 热重载产生多个模拟器实例)。 */
export function getDriver(): HardwareDriver {
  if (!g.__hardwareDriver) g.__hardwareDriver = new SimDriver();
  return g.__hardwareDriver;
}

export { SimDriver };
export type { HardwareDriver, EnvReading, LightCmd } from "./driver";

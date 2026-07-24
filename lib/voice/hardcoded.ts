import type { ParsedCommand } from "@/lib/voice/command";

const COMMANDS: Record<string, ParsedCommand> = {
  关灯: { action: "setLight", params: { on: false, brightness: 0 } },
  开灯: {
    action: "setLight",
    params: { on: true, brightness: 30, colorTemp: "warm" },
  },
  调高温度: { action: "setClimate", params: { deltaC: 1 } },
  调低温度: { action: "setClimate", params: { deltaC: -1 } },
  开夜灯: {
    action: "setLight",
    params: { on: true, brightness: 12, colorTemp: "warm" },
  },
  关夜灯: { action: "setLight", params: { on: false, brightness: 0 } },
};

export function matchHardcoded(text: string): ParsedCommand | null {
  const normalized = text.trim().replace(/[。！!？?]+$/g, "");
  return COMMANDS[normalized] ?? null;
}

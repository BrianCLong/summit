import { buildContextPack } from "../context-os/context-pack-engine.js";
import { ACPContext } from "./types.js";

export async function getContext(task: string): Promise<ACPContext> {
  const pack = buildContextPack(task);
  return {
    protocol: "ACP/0.1",
    task,
    context: pack
  };
}

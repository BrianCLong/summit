import { ContextPack } from "./types.js";

export function buildContextPack(task: string): ContextPack {
  return {
    task,
    files: [],
    symbols: [],
    tests: []
  };
}

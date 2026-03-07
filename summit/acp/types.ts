import { ContextPack } from "../context-os/types.js";

export interface ACPContext {
  protocol: "ACP/0.1";
  task: string;
  context: ContextPack;
}

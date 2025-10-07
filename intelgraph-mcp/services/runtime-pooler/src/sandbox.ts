export type SandboxContext = {
  vmId: string;
  sandboxId: string;
  caps: string[];
};

export function buildSandboxContext(vmId: string, caps: string[]): SandboxContext {
  return { vmId, sandboxId: `sbx_${Math.random().toString(36).slice(2)}`, caps };
}

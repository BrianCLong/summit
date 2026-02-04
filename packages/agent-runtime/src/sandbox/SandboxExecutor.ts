export interface SandboxEgressPolicy {
  defaultDeny: true;
  allowHosts: string[];
}

export interface SandboxExecutor {
  exec(command: string): Promise<{ code: number; stdout: string; stderr: string }>;
  writeFile(path: string, content: string): Promise<void>;
  readFile(path: string): Promise<string>;
  setEgressPolicy(policy: SandboxEgressPolicy): Promise<void>;
}

export function isSandboxRuntimeEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  return env.FEATURE_SANDBOX_RUNTIME === "1";
}

export function isCloudflareSandboxAdapterEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  return env.FEATURE_SANDBOX_RUNTIME_ADAPTER_CLOUDFLARE === "1";
}

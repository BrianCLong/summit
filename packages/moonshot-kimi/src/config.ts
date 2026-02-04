export type MoonshotConfig = {
  apiKey: string;
  baseUrl: string; // default https://api.moonshot.ai/v1
  enableVision: boolean;
  enableVideo: boolean;
  enabled: boolean;
};

export function loadMoonshotConfig(env: NodeJS.ProcessEnv): MoonshotConfig {
  const apiKey = env.MOONSHOT_API_KEY ?? "";
  const baseUrl = env.MOONSHOT_API_BASE ?? "https://api.moonshot.ai/v1";
  return {
    apiKey,
    baseUrl,
    enableVision: env.SUMMIT_MOONSHOT_VISION === "1",
    enableVideo: env.SUMMIT_MOONSHOT_VIDEO === "1",
    enabled: env.SUMMIT_PROVIDER_MOONSHOT_KIMI === "1"
  };
}

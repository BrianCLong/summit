"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadMoonshotConfig = loadMoonshotConfig;
function loadMoonshotConfig(env) {
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

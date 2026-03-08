"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.defaultConfig = void 0;
exports.defaultConfig = {
    providers: {
        openai: {
            enabled: !!process.env.OPENAI_API_KEY,
            apiKey: process.env.OPENAI_API_KEY
        },
        mock: {
            enabled: true
        },
        nvidiaNim: {
            enabled: !!process.env.NVIDIA_NIM_API_KEY,
            apiKey: process.env.NVIDIA_NIM_API_KEY,
            baseUrl: process.env.NVIDIA_NIM_BASE_URL || "https://integrate.api.nvidia.com/v1",
            model: process.env.NVIDIA_NIM_MODEL || "moonshotai/kimi-k2.5",
            modeDefault: "instant",
            enableMultimodal: process.env.NVIDIA_NIM_MULTIMODAL === "true"
        }
    },
    policies: {
        costControl: {
            enabled: true,
            maxCostPerRequest: 0.05
        },
        latencyOptimization: {
            enabled: true
        }
    },
    guardrails: {
        piiRedaction: {
            enabled: true
        }
    },
    cache: {
        enabled: true,
        ttlMs: 1000 * 60 * 60 // 1 hour
    },
    logging: {
        enabled: true,
        logDir: process.env.LLM_LOG_DIR || 'logs/llm'
    }
};

import { ProviderType } from './types.js';

export interface LLMRouterConfig {
    providers: {
        openai: {
            enabled: boolean;
            apiKey?: string;
        };
        mock: {
            enabled: boolean;
        };
        nvidiaNim: {
            enabled: boolean;
            apiKey?: string;
            baseUrl?: string;
            model?: string;
            modeDefault?: "instant" | "thinking";
            enableMultimodal?: boolean;
        };
    };
    policies: {
        costControl: {
            enabled: boolean;
            maxCostPerRequest: number;
        };
        latencyOptimization: {
            enabled: boolean;
        };
    };
    guardrails: {
        piiRedaction: {
            enabled: boolean;
        };
    };
    cache: {
        enabled: boolean;
        ttlMs: number;
    };
    logging: {
        enabled: boolean;
        logDir: string;
    };
}

export const defaultConfig: LLMRouterConfig = {
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

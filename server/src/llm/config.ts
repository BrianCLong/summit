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

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MoonshotClient = void 0;
const config_js_1 = require("./config.js");
class MoonshotClient {
    config;
    constructor(config) {
        this.config = config ?? (0, config_js_1.loadMoonshotConfig)(process.env);
    }
    async chat(req) {
        if (!this.config.enabled) {
            throw new Error("Moonshot provider is disabled. Set SUMMIT_PROVIDER_MOONSHOT_KIMI=1 to enable.");
        }
        const url = `${this.config.baseUrl}/chat/completions`;
        let attempt = 0;
        const maxRetries = 3;
        let lastError;
        while (attempt <= maxRetries) {
            try {
                const response = await fetch(url, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${this.config.apiKey}`
                    },
                    body: JSON.stringify(req)
                });
                if (response.ok) {
                    return response.json();
                }
                if (response.status === 429 || response.status >= 500) {
                    const errorText = await response.text();
                    lastError = new Error(`Moonshot API error: ${response.status} ${errorText}`);
                    attempt++;
                    if (attempt <= maxRetries) {
                        await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempt))); // Exponential backoff
                        continue;
                    }
                }
                else {
                    const errorText = await response.text();
                    throw new Error(`Moonshot API error: ${response.status} ${errorText}`);
                }
            }
            catch (e) {
                lastError = e;
                attempt++;
                if (attempt <= maxRetries) {
                    await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempt)));
                    continue;
                }
            }
        }
        throw lastError;
    }
}
exports.MoonshotClient = MoonshotClient;

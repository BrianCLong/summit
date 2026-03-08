"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DefaultModelCatalog = exports.DEFAULT_CATALOG = void 0;
exports.DEFAULT_CATALOG = [
    {
        id: "gpt-4o-mini",
        provider: "openai",
        costPer1kTokens: 0.0006, // Approximation
        capabilities: {
            maxTokens: 128000,
            reasoning: false,
            coding: true,
            domains: ["general", "fast"]
        }
    },
    {
        id: "gpt-4o",
        provider: "openai",
        costPer1kTokens: 0.01,
        capabilities: {
            maxTokens: 128000,
            reasoning: true,
            coding: true,
            domains: ["general", "complex"]
        }
    },
    {
        id: "o1-preview",
        provider: "openai",
        costPer1kTokens: 0.04, // High cost
        capabilities: {
            maxTokens: 128000,
            reasoning: true,
            coding: true,
            domains: ["math", "science", "deep-reasoning"]
        }
    },
    {
        id: "claude-3-haiku-20240307",
        provider: "anthropic",
        costPer1kTokens: 0.00025,
        capabilities: {
            maxTokens: 200000,
            reasoning: false,
            coding: true,
            domains: ["fast"]
        }
    },
    {
        id: "claude-3-5-sonnet-20241022",
        provider: "anthropic",
        costPer1kTokens: 0.003,
        capabilities: {
            maxTokens: 200000,
            reasoning: true,
            coding: true,
            domains: ["coding", "complex"]
        }
    }
];
class DefaultModelCatalog {
    async getModels() {
        return exports.DEFAULT_CATALOG;
    }
    async getModel(id) {
        return exports.DEFAULT_CATALOG.find(m => m.id === id);
    }
}
exports.DefaultModelCatalog = DefaultModelCatalog;

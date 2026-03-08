"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.stripSpeculation = stripSpeculation;
exports.extractIntent = extractIntent;
const prompt_js_1 = require("../utils/prompt.js");
const json_js_1 = require("../utils/json.js");
const openai_client_js_1 = require("../llm/openai-client.js");
function stripSpeculation(summaries) {
    return summaries.map((summary) => ({
        schemaVersion: summary.schemaVersion,
        screenContext: summary.screenContext,
        actions: summary.actions,
        locale: summary.locale,
        provenance: summary.provenance,
    }));
}
async function extractIntent(summaries, options) {
    const prompt = await (0, prompt_js_1.loadPromptTemplate)(options.promptPath, options.promptId, options.promptVersion);
    const client = new openai_client_js_1.OpenAICompatibleClient(options.baseUrl, options.apiKey);
    const promptText = (0, prompt_js_1.fillTemplate)(prompt.content, {
        summaries: JSON.stringify(summaries, null, 2),
    });
    const response = await client.complete(promptText, {
        model: options.modelId,
        maxTokens: options.maxTokens ?? 350,
        temperature: 0.2,
    });
    const parsed = (0, json_js_1.safeJsonParse)(response);
    return {
        ...parsed,
        schemaVersion: parsed.schemaVersion ?? 'v1',
        provenance: {
            ...parsed.provenance,
            modelId: options.modelId,
            promptHash: prompt.sha256,
            promptId: options.promptId,
            promptVersion: options.promptVersion,
            generatedAt: new Date().toISOString(),
        },
    };
}

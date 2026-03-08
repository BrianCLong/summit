"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cleanGoldIntent = cleanGoldIntent;
const prompt_js_1 = require("../utils/prompt.js");
const openai_client_js_1 = require("../llm/openai-client.js");
async function cleanGoldIntent(summaries, goldIntent, options) {
    const prompt = await (0, prompt_js_1.loadPromptTemplate)(options.promptPath, options.promptId, options.promptVersion);
    const client = new openai_client_js_1.OpenAICompatibleClient(options.baseUrl, options.apiKey);
    const promptText = (0, prompt_js_1.fillTemplate)(prompt.content, {
        summaries: JSON.stringify(summaries, null, 2),
        goldIntent,
    });
    const response = await client.complete(promptText, {
        model: options.modelId,
        maxTokens: options.maxTokens ?? 250,
        temperature: 0,
    });
    return response.trim();
}

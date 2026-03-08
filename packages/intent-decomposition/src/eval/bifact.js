"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.evaluateBiFact = evaluateBiFact;
const prompt_js_1 = require("../utils/prompt.js");
const json_js_1 = require("../utils/json.js");
const openai_client_js_1 = require("../llm/openai-client.js");
function computeScores(predicted, refEntailed, predEntailed) {
    const truePos = predEntailed.filter((entry) => entry.entails).length;
    const precision = predicted.length ? truePos / predicted.length : 0;
    const recall = refEntailed.length
        ? refEntailed.filter((entry) => entry.entails).length / refEntailed.length
        : 0;
    const f1 = precision + recall === 0 ? 0 : (2 * precision * recall) / (precision + recall);
    return { precision, recall, f1 };
}
async function extractFacts(intent, template, options) {
    const client = new openai_client_js_1.OpenAICompatibleClient(options.baseUrl, options.apiKey);
    const promptText = (0, prompt_js_1.fillTemplate)(template.content, {
        intent,
    });
    const response = await client.complete(promptText, {
        model: options.modelId,
        maxTokens: options.maxTokens ?? 300,
        temperature: 0,
    });
    const parsed = (0, json_js_1.safeJsonParse)(response);
    return parsed.facts;
}
async function entailmentCheck(premiseFacts, hypothesisFacts, template, options) {
    const client = new openai_client_js_1.OpenAICompatibleClient(options.baseUrl, options.apiKey);
    const promptText = (0, prompt_js_1.fillTemplate)(template.content, {
        premiseFacts: JSON.stringify(premiseFacts, null, 2),
        hypothesisFacts: JSON.stringify(hypothesisFacts, null, 2),
    });
    const response = await client.complete(promptText, {
        model: options.modelId,
        maxTokens: options.maxTokens ?? 400,
        temperature: 0,
    });
    const parsed = (0, json_js_1.safeJsonParse)(response);
    return parsed.entailments;
}
async function evaluateBiFact(input, prompts) {
    const extractTemplate = await (0, prompt_js_1.loadPromptTemplate)(prompts.extractFacts.promptPath, prompts.extractFacts.promptId, prompts.extractFacts.promptVersion);
    const entailTemplate = await (0, prompt_js_1.loadPromptTemplate)(prompts.entailment.promptPath, prompts.entailment.promptId, prompts.entailment.promptVersion);
    const referenceFacts = await extractFacts(input.referenceIntent, extractTemplate, prompts.extractFacts);
    const predictedFacts = await extractFacts(input.predictedIntent, extractTemplate, prompts.extractFacts);
    const referenceEntailedByPrediction = await entailmentCheck(predictedFacts, referenceFacts, entailTemplate, prompts.entailment);
    const predictionEntailedByReference = await entailmentCheck(referenceFacts, predictedFacts, entailTemplate, prompts.entailment);
    const scores = computeScores(predictedFacts, referenceEntailedByPrediction, predictionEntailedByReference);
    const missedFacts = referenceEntailedByPrediction
        .filter((entry) => !entry.entails)
        .map((entry) => entry.fact)
        .filter((fact) => !input.stage1Facts.includes(fact));
    const hallucinatedFacts = predictionEntailedByReference
        .filter((entry) => !entry.entails)
        .map((entry) => entry.fact);
    return {
        schemaVersion: 'v1',
        referenceFacts,
        predictedFacts,
        referenceEntailedByPrediction,
        predictionEntailedByReference,
        precision: scores.precision,
        recall: scores.recall,
        f1: scores.f1,
        errorPropagation: {
            missedFacts,
            hallucinatedFacts,
        },
        evaluatedAt: new Date().toISOString(),
        judge: {
            modelId: prompts.entailment.modelId,
            promptHash: entailTemplate.sha256,
            promptId: prompts.entailment.promptId,
            promptVersion: prompts.entailment.promptVersion,
        },
    };
}

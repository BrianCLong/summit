"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.summarizeTrajectory = summarizeTrajectory;
exports.loadTrajectory = loadTrajectory;
const promises_1 = require("fs/promises");
const path_1 = __importDefault(require("path"));
const prompt_js_1 = require("../utils/prompt.js");
const json_js_1 = require("../utils/json.js");
const openai_client_js_1 = require("../llm/openai-client.js");
function buildWindow(frames, index) {
    return {
        previous: frames[index - 1],
        current: frames[index],
        next: frames[index + 1],
    };
}
function actionsForFrame(actions, frame) {
    const frameTime = new Date(frame.timestamp).getTime();
    return actions.filter((action) => {
        const actionTime = new Date(action.timestamp).getTime();
        return Math.abs(actionTime - frameTime) <= 60_000;
    });
}
async function summarizeTrajectory(input, options) {
    const prompt = await (0, prompt_js_1.loadPromptTemplate)(options.promptPath, options.promptId, options.promptVersion);
    const client = new openai_client_js_1.OpenAICompatibleClient(options.baseUrl, options.apiKey);
    const summaries = [];
    for (let index = 0; index < input.frames.length; index += 1) {
        const window = buildWindow(input.frames, index);
        const contextActions = actionsForFrame(input.actions, window.current);
        const promptText = (0, prompt_js_1.fillTemplate)(prompt.content, {
            previousFrame: JSON.stringify(window.previous ?? null, null, 2),
            currentFrame: JSON.stringify(window.current, null, 2),
            nextFrame: JSON.stringify(window.next ?? null, null, 2),
            actions: JSON.stringify(contextActions, null, 2),
        });
        const response = await client.complete(promptText, {
            model: options.modelId,
            maxTokens: options.maxTokens ?? 700,
            temperature: 0.1,
        });
        const parsed = (0, json_js_1.safeJsonParse)(response);
        const summary = {
            ...parsed,
            schemaVersion: parsed.schemaVersion ?? 'v1',
            locale: parsed.locale ?? window.current.locale,
            provenance: {
                ...parsed.provenance,
                modelId: options.modelId,
                promptHash: prompt.sha256,
                promptId: options.promptId,
                promptVersion: options.promptVersion,
                window: {
                    previousFrameId: window.previous?.id,
                    currentFrameId: window.current.id,
                    nextFrameId: window.next?.id,
                },
                generatedAt: new Date().toISOString(),
            },
        };
        summaries.push(summary);
    }
    return summaries;
}
async function loadTrajectory(inputPath) {
    const payload = await (0, promises_1.readFile)(path_1.default.resolve(inputPath), 'utf8');
    return (0, json_js_1.safeJsonParse)(payload);
}

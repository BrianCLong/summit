#!/usr/bin/env node
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const commander_1 = require("commander");
const promises_1 = require("fs/promises");
const path_1 = __importDefault(require("path"));
const extract_intent_js_1 = require("./pipeline/extract-intent.js");
const summarize_js_1 = require("./pipeline/summarize.js");
const clean_labels_js_1 = require("./pipeline/clean-labels.js");
const bifact_js_1 = require("./eval/bifact.js");
const json_js_1 = require("./utils/json.js");
const program = new commander_1.Command();
program
    .name('summit-intent')
    .description('Intent decomposition CLI for UI trajectories')
    .version('0.1.0');
program
    .command('summarize')
    .requiredOption('-i, --input <path>', 'Trajectory JSON input file')
    .requiredOption('-o, --output <path>', 'Output file for StepSummary JSON')
    .requiredOption('--prompt <path>', 'Stage 1 prompt template path')
    .requiredOption('--model <id>', 'Model ID for stage 1')
    .option('--base-url <url>', 'LLM base URL', 'http://localhost:11434')
    .option('--api-key <key>', 'LLM API key')
    .option('--prompt-id <id>', 'Prompt ID', 'intent-stage1')
    .option('--prompt-version <version>', 'Prompt version', 'v1')
    .action(async (options) => {
    const trajectory = await (0, summarize_js_1.loadTrajectory)(options.input);
    const summaries = await (0, summarize_js_1.summarizeTrajectory)(trajectory, {
        modelId: options.model,
        promptId: options.promptId,
        promptVersion: options.promptVersion,
        promptPath: path_1.default.resolve(options.prompt),
        baseUrl: options.baseUrl,
        apiKey: options.apiKey,
    });
    await (0, promises_1.writeFile)(options.output, JSON.stringify(summaries, null, 2));
});
program
    .command('extract')
    .requiredOption('-i, --input <path>', 'StepSummary JSON input file')
    .requiredOption('-o, --output <path>', 'Output file for IntentStatement JSON')
    .requiredOption('--prompt <path>', 'Stage 2 prompt template path')
    .requiredOption('--model <id>', 'Model ID for stage 2')
    .option('--base-url <url>', 'LLM base URL', 'http://localhost:11434')
    .option('--api-key <key>', 'LLM API key')
    .option('--prompt-id <id>', 'Prompt ID', 'intent-stage2')
    .option('--prompt-version <version>', 'Prompt version', 'v1')
    .action(async (options) => {
    const payload = await (0, promises_1.readFile)(path_1.default.resolve(options.input), 'utf8');
    const summaries = (0, json_js_1.safeJsonParse)(payload);
    const factual = (0, extract_intent_js_1.stripSpeculation)(summaries);
    const intent = await (0, extract_intent_js_1.extractIntent)(factual, {
        modelId: options.model,
        promptId: options.promptId,
        promptVersion: options.promptVersion,
        promptPath: path_1.default.resolve(options.prompt),
        baseUrl: options.baseUrl,
        apiKey: options.apiKey,
    });
    await (0, promises_1.writeFile)(options.output, JSON.stringify(intent, null, 2));
});
program
    .command('clean-labels')
    .requiredOption('-i, --input <path>', 'StepSummary JSON input file')
    .requiredOption('-g, --gold <text>', 'Original gold intent text')
    .requiredOption('-o, --output <path>', 'Output file for cleaned intent text')
    .requiredOption('--prompt <path>', 'Label cleaning prompt template path')
    .requiredOption('--model <id>', 'Model ID for label cleaning')
    .option('--base-url <url>', 'LLM base URL', 'http://localhost:11434')
    .option('--api-key <key>', 'LLM API key')
    .option('--prompt-id <id>', 'Prompt ID', 'intent-clean')
    .option('--prompt-version <version>', 'Prompt version', 'v1')
    .action(async (options) => {
    const payload = await (0, promises_1.readFile)(path_1.default.resolve(options.input), 'utf8');
    const summaries = (0, json_js_1.safeJsonParse)(payload);
    const factual = (0, extract_intent_js_1.stripSpeculation)(summaries);
    const cleaned = await (0, clean_labels_js_1.cleanGoldIntent)(factual, options.gold, {
        modelId: options.model,
        promptId: options.promptId,
        promptVersion: options.promptVersion,
        promptPath: path_1.default.resolve(options.prompt),
        baseUrl: options.baseUrl,
        apiKey: options.apiKey,
    });
    await (0, promises_1.writeFile)(options.output, cleaned);
});
program
    .command('eval')
    .requiredOption('-p, --predicted <path>', 'Predicted intent JSON')
    .requiredOption('-r, --reference <path>', 'Reference intent JSON')
    .requiredOption('-s, --stage1 <path>', 'Stage 1 factual summaries JSON')
    .requiredOption('-o, --output <path>', 'Output JSONL for evaluation')
    .requiredOption('--extract-prompt <path>', 'Atomic fact extraction prompt')
    .requiredOption('--entail-prompt <path>', 'Entailment prompt')
    .requiredOption('--model <id>', 'Judge model ID')
    .option('--base-url <url>', 'LLM base URL', 'http://localhost:11434')
    .option('--api-key <key>', 'LLM API key')
    .option('--prompt-id <id>', 'Prompt ID', 'intent-bifact')
    .option('--prompt-version <version>', 'Prompt version', 'v1')
    .option('--junit <path>', 'JUnit XML output path')
    .option('--min-f1 <number>', 'Minimum F1 threshold', '0.72')
    .option('--max-hallucination <number>', 'Max hallucination rate', '0.12')
    .option('--max-missed <number>', 'Max missed-fact rate', '0.18')
    .action(async (options) => {
    const predictedPayload = await (0, promises_1.readFile)(path_1.default.resolve(options.predicted), 'utf8');
    const referencePayload = await (0, promises_1.readFile)(path_1.default.resolve(options.reference), 'utf8');
    const stage1Payload = await (0, promises_1.readFile)(path_1.default.resolve(options.stage1), 'utf8');
    const predicted = (0, json_js_1.safeJsonParse)(predictedPayload);
    const reference = (0, json_js_1.safeJsonParse)(referencePayload);
    const stage1Data = (0, json_js_1.safeJsonParse)(stage1Payload);
    const summaries = stage1Data.length
        ? 'speculationText' in stage1Data[0]
            ? (0, extract_intent_js_1.stripSpeculation)(stage1Data)
            : stage1Data
        : [];
    const stage1Facts = summaries.flatMap((summary) => summary.screenContext.map((item) => item.value).concat(summary.actions.map((item) => item.value)));
    const result = await (0, bifact_js_1.evaluateBiFact)({
        referenceIntent: reference.intent,
        predictedIntent: predicted.intent,
        stage1Facts,
    }, {
        extractFacts: {
            modelId: options.model,
            promptId: options.promptId,
            promptVersion: options.promptVersion,
            promptPath: path_1.default.resolve(options.extractPrompt),
            baseUrl: options.baseUrl,
            apiKey: options.apiKey,
        },
        entailment: {
            modelId: options.model,
            promptId: options.promptId,
            promptVersion: options.promptVersion,
            promptPath: path_1.default.resolve(options.entailPrompt),
            baseUrl: options.baseUrl,
            apiKey: options.apiKey,
        },
    });
    await (0, promises_1.writeFile)(options.output, `${JSON.stringify(result)}\n`);
    if (options.junit) {
        const minF1 = Number(options.minF1);
        const maxHallucination = Number(options.maxHallucination);
        const maxMissed = Number(options.maxMissed);
        const hallucinationRate = result.predictedFacts.length
            ? result.errorPropagation.hallucinatedFacts.length /
                result.predictedFacts.length
            : 0;
        const missedRate = result.referenceFacts.length
            ? result.errorPropagation.missedFacts.length / result.referenceFacts.length
            : 0;
        const failures = [];
        if (result.f1 < minF1) {
            failures.push(`F1 ${result.f1.toFixed(2)} below ${minF1}`);
        }
        if (hallucinationRate > maxHallucination) {
            failures.push(`Hallucination rate ${hallucinationRate.toFixed(2)} above ${maxHallucination}`);
        }
        if (missedRate > maxMissed) {
            failures.push(`Missed fact rate ${missedRate.toFixed(2)} above ${maxMissed}`);
        }
        const failureBlock = failures.length
            ? `<failure message=\"Intent evaluation gate failed\"><![CDATA[${failures.join('\\n')}]]></failure>`
            : '';
        const junitXml = `<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<testsuite name=\"intent-decomposition\" tests=\"1\" failures=\"${failures.length}\">\n  <testcase classname=\"intent\" name=\"bifact-gate\">\n    ${failureBlock}\n  </testcase>\n</testsuite>\n`;
        await (0, promises_1.writeFile)(options.junit, junitXml);
    }
});
program.parseAsync(process.argv).catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
});

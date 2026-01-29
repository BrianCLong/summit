#!/usr/bin/env node
import { Command } from 'commander';
import { readFile, writeFile } from 'fs/promises';
import path from 'path';
import {
  extractIntent,
  stripSpeculation,
} from './pipeline/extract-intent.js';
import { summarizeTrajectory, loadTrajectory } from './pipeline/summarize.js';
import { cleanGoldIntent } from './pipeline/clean-labels.js';
import { evaluateBiFact } from './eval/bifact.js';
import {
  StepSummary,
  StepSummaryFactual,
  IntentStatement,
  BiFactEval,
} from './types.js';
import { safeJsonParse } from './utils/json.js';

const program = new Command();

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
    const trajectory = await loadTrajectory(options.input);
    const summaries = await summarizeTrajectory(trajectory, {
      modelId: options.model,
      promptId: options.promptId,
      promptVersion: options.promptVersion,
      promptPath: path.resolve(options.prompt),
      baseUrl: options.baseUrl,
      apiKey: options.apiKey,
    });
    await writeFile(options.output, JSON.stringify(summaries, null, 2));
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
    const payload = await readFile(path.resolve(options.input), 'utf8');
    const summaries = safeJsonParse<StepSummary[]>(payload);
    const factual = stripSpeculation(summaries);
    const intent = await extractIntent(factual, {
      modelId: options.model,
      promptId: options.promptId,
      promptVersion: options.promptVersion,
      promptPath: path.resolve(options.prompt),
      baseUrl: options.baseUrl,
      apiKey: options.apiKey,
    });
    await writeFile(options.output, JSON.stringify(intent, null, 2));
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
    const payload = await readFile(path.resolve(options.input), 'utf8');
    const summaries = safeJsonParse<StepSummary[]>(payload);
    const factual = stripSpeculation(summaries);
    const cleaned = await cleanGoldIntent(factual, options.gold, {
      modelId: options.model,
      promptId: options.promptId,
      promptVersion: options.promptVersion,
      promptPath: path.resolve(options.prompt),
      baseUrl: options.baseUrl,
      apiKey: options.apiKey,
    });
    await writeFile(options.output, cleaned);
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
    const predictedPayload = await readFile(path.resolve(options.predicted), 'utf8');
    const referencePayload = await readFile(path.resolve(options.reference), 'utf8');
    const stage1Payload = await readFile(path.resolve(options.stage1), 'utf8');

    const predicted = safeJsonParse<IntentStatement>(predictedPayload);
    const reference = safeJsonParse<IntentStatement>(referencePayload);
    const stage1Data = safeJsonParse<Array<StepSummary | StepSummaryFactual>>(
      stage1Payload,
    );
    const summaries = stage1Data.length
      ? 'speculationText' in stage1Data[0]
        ? stripSpeculation(stage1Data as StepSummary[])
        : (stage1Data as StepSummaryFactual[])
      : [];

    const stage1Facts = summaries.flatMap((summary) =>
      summary.screenContext.map((item) => item.value).concat(
        summary.actions.map((item) => item.value),
      ),
    );

    const result: BiFactEval = await evaluateBiFact(
      {
        referenceIntent: reference.intent,
        predictedIntent: predicted.intent,
        stage1Facts,
      },
      {
        extractFacts: {
          modelId: options.model,
          promptId: options.promptId,
          promptVersion: options.promptVersion,
          promptPath: path.resolve(options.extractPrompt),
          baseUrl: options.baseUrl,
          apiKey: options.apiKey,
        },
        entailment: {
          modelId: options.model,
          promptId: options.promptId,
          promptVersion: options.promptVersion,
          promptPath: path.resolve(options.entailPrompt),
          baseUrl: options.baseUrl,
          apiKey: options.apiKey,
        },
      },
    );

    await writeFile(options.output, `${JSON.stringify(result)}\n`);

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
      const failures: string[] = [];

      if (result.f1 < minF1) {
        failures.push(`F1 ${result.f1.toFixed(2)} below ${minF1}`);
      }
      if (hallucinationRate > maxHallucination) {
        failures.push(
          `Hallucination rate ${hallucinationRate.toFixed(2)} above ${maxHallucination}`,
        );
      }
      if (missedRate > maxMissed) {
        failures.push(
          `Missed fact rate ${missedRate.toFixed(2)} above ${maxMissed}`,
        );
      }

      const failureBlock = failures.length
        ? `<failure message=\"Intent evaluation gate failed\"><![CDATA[${failures.join(
            '\\n',
          )}]]></failure>`
        : '';
      const junitXml = `<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<testsuite name=\"intent-decomposition\" tests=\"1\" failures=\"${failures.length}\">\n  <testcase classname=\"intent\" name=\"bifact-gate\">\n    ${failureBlock}\n  </testcase>\n</testsuite>\n`;
      await writeFile(options.junit, junitXml);
    }
  });

program.parseAsync(process.argv).catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});

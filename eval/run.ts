import { Command } from 'commander';
import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';
import { EvalItemSchema, EvalReportSchema } from './types.js';
import { scoreItem, generateReport } from './scorer.js';

const program = new Command();

program
  .name('intelgraph-eval')
  .description('GA Evaluation Harness for MVP-4')
  .option('-d, --dataset <path>', 'Path to dataset .jsonl file', 'eval/datasets/mvp4ga-mini.jsonl')
  .option('-o, --output <path>', 'Path to output JSON report', 'eval/reports/report.json')
  .option('-m, --mock', 'Run in mock mode (no real model calls)', false)
  .action(async (options) => {
    console.log(`Starting evaluation run...`);
    console.log(`Dataset: ${options.dataset}`);
    console.log(`Mode: ${options.mock ? 'MOCK' : 'REAL'}`);

    const datasetPath = path.resolve(options.dataset);
    if (!fs.existsSync(datasetPath)) {
      console.error(`Dataset not found: ${datasetPath}`);
      process.exit(1);
    }

    const fileStream = fs.createReadStream(datasetPath);
    const rl = readline.createInterface({
      input: fileStream,
      crlfDelay: Infinity
    });

    const results = [];

    for await (const line of rl) {
      if (!line.trim()) continue;

      try {
        const item = EvalItemSchema.parse(JSON.parse(line));

        let actualResponse = "";

        if (options.mock) {
            // Simulate model behavior
            if (item.criteria?.startsWith("Exact match:")) {
               actualResponse = item.criteria.replace("Exact match:", "").trim();
            } else {
               // Fuzzy logic for mock: return expected text mostly
               actualResponse = `Analysis suggests: ${item.expected}`;
            }
        } else {
            // Real mode stub
            // TODO: Connect to actual RAG/LLM service
            console.warn("Real mode not yet implemented, falling back to stub.");
            actualResponse = "Not implemented";
        }

        const result = scoreItem(item, actualResponse);
        results.push(result);

      } catch (e) {
        console.error(`Failed to process line: ${line}`, e);
      }
    }

    const report = generateReport(results, { mock: options.mock, dataset: options.dataset });

    // Validate report against schema
    const validatedReport = EvalReportSchema.parse(report);

    const outputDir = path.dirname(options.output);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    fs.writeFileSync(options.output, JSON.stringify(validatedReport, null, 2));
    console.log(`Report written to ${options.output}`);
    console.log(`Summary: ${validatedReport.summary.passed}/${validatedReport.summary.total} passed (${(validatedReport.summary.accuracy * 100).toFixed(1)}%)`);

    if (validatedReport.summary.accuracy < 1.0 && options.mock) {
       // In mock mode we expect 100% if we set it up right, but heuristics might vary.
       // console.warn("Warning: Mock mode did not achieve 100% accuracy.");
    }
  });

program.parse(process.argv);

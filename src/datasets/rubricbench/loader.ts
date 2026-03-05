import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import type { Connector, ConnectorConfig } from '../../../packages/sdk-ts/src/connector.js';
import type { RunContext } from '../../../packages/sdk-ts/src/types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface RubricBenchItem {
  instruction: string;
  output_a: string;
  output_b: string;
  human_preference: "A" | "B";
  rubrics: string[];
}

export class RubricBenchConnector implements Connector<void, RubricBenchItem[]> {
  async init(ctx: RunContext): Promise<void> {
    // Initialization logic if any
  }

  async send(ctx: RunContext, input: void, cfg?: ConnectorConfig): Promise<RubricBenchItem[]> {
    const dataPath = path.resolve(__dirname, 'dataset.json');
    const rawData = fs.readFileSync(dataPath, 'utf-8');
    return JSON.parse(rawData) as RubricBenchItem[];
  }
}

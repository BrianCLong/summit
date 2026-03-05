import * as fs from 'fs';
import * as path from 'path';

export interface RubricBenchItem {
  instruction: string;
  output_a: string;
  output_b: string;
  human_preference: "A" | "B";
  rubrics: string[];
}

export function loadRubricBenchDataset(): RubricBenchItem[] {
  // Use relative path from CWD for simplicity or a robust module path
  const dataPath = path.resolve('src/datasets/rubricbench/dataset.json');
  const rawData = fs.readFileSync(dataPath, 'utf-8');
  return JSON.parse(rawData) as RubricBenchItem[];
}

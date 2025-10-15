import fs from 'fs';
import path from 'path';

const LOG_FILE = path.join(__dirname, '../../runs/learner-metrics.jsonl');

export function logLearnerMetric(data: Record<string, unknown>) {
  const logEntry = JSON.stringify(data) + '\n';
  fs.appendFileSync(LOG_FILE, logEntry, 'utf8');
}

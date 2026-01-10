import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

interface FrictionMetrics {
  todoCount: number;
  fixmeCount: number;
  skippedTests: number;
  deprecatedJustfile: boolean;
  timestamp: string;
}

function scanFriction(): FrictionMetrics {
  const metrics: FrictionMetrics = {
    todoCount: 0,
    fixmeCount: 0,
    skippedTests: 0,
    deprecatedJustfile: false,
    timestamp: new Date().toISOString(),
  };

  try {
    const todoOutput = execSync('grep -r "TODO" . --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=dist || true', { encoding: 'utf-8' });
    metrics.todoCount = todoOutput.split('\n').filter(Boolean).length;

    const fixmeOutput = execSync('grep -r "FIXME" . --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=dist || true', { encoding: 'utf-8' });
    metrics.fixmeCount = fixmeOutput.split('\n').filter(Boolean).length;

    // Check for skipped tests in common test files
    const skippedOutput = execSync('grep -r "\.skip" . --include="*.test.ts" --include="*.spec.ts" --exclude-dir=node_modules --exclude-dir=.git || true', { encoding: 'utf-8' });
    metrics.skippedTests = skippedOutput.split('\n').filter(Boolean).length;

  } catch (error) {
    console.error('Error executing grep:', error);
  }

  if (fs.existsSync('Justfile')) {
    metrics.deprecatedJustfile = true;
  }

  return metrics;
}

const metrics = scanFriction();
console.log(JSON.stringify(metrics, null, 2));

const REPORT_PATH = 'friction-report.json';
fs.writeFileSync(REPORT_PATH, JSON.stringify(metrics, null, 2));
console.log(`Report saved to ${REPORT_PATH}`);

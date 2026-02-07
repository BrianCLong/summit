#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface Config {
  mode: 'warn' | 'strict' | 'off';
  plan_file: string;
  required_sections: string[];
  check_todos: boolean;
  todo_patterns: string[];
  max_files?: number;
  agent_labels?: string[];
}

interface Violation {
  rule: string;
  message: string;
  file?: string;
  line?: number;
}

interface Report {
  status: 'pass' | 'fail' | 'warn';
  checks: {
    plan_exists: boolean;
    plan_valid: boolean;
    clean_code: boolean;
  };
  violations: Violation[];
  metadata: {
    timestamp: string;
    files_checked: number;
    config_mode: string;
  };
  skipped?: boolean;
}

const DEFAULT_CONFIG: Config = {
  mode: 'warn',
  plan_file: 'PLAN.md',
  required_sections: ['Goal', 'Constraints', 'Verification'],
  check_todos: true,
  todo_patterns: ['TODO:', 'FIXME:'],
};

function loadConfig(): Config {
  try {
    const configPath = path.join(__dirname, 'config.json');
    if (fs.existsSync(configPath)) {
      const raw = fs.readFileSync(configPath, 'utf-8');
      return { ...DEFAULT_CONFIG, ...JSON.parse(raw) };
    }
  } catch (e) {
    console.warn('Failed to load config, using defaults', e);
  }
  return DEFAULT_CONFIG;
}

function writeReportAndExit(report: Report, exitCode: number) {
  const artifactsDir = path.resolve(process.cwd(), 'artifacts/agentic_policy');
  if (!fs.existsSync(artifactsDir)) {
    fs.mkdirSync(artifactsDir, { recursive: true });
  }

  delete (report.metadata as any).timestamp;
  (report.metadata as any).sha = process.env.GITHUB_SHA || 'unknown';

  fs.writeFileSync(path.join(artifactsDir, 'report.json'), JSON.stringify(report, null, 2));

  const metrics = {
    violation_count: report.violations.length,
    files_count: report.metadata.files_checked,
  };
  fs.writeFileSync(path.join(artifactsDir, 'metrics.json'), JSON.stringify(metrics, null, 2));

  const stamp = {
    sha: process.env.GITHUB_SHA || 'unknown',
    status: report.status,
    gate: 'Agentic Plan Gate'
  };
  fs.writeFileSync(path.join(artifactsDir, 'stamp.json'), JSON.stringify(stamp, null, 2));

  console.log(JSON.stringify(report, null, 2));
  process.exit(exitCode);
}

function checkPlan(config: Config): { exists: boolean; valid: boolean; violations: Violation[] } {
  const violations: Violation[] = [];
  const planPath = path.resolve(process.cwd(), config.plan_file);

  if (!fs.existsSync(planPath)) {
    violations.push({
      rule: 'MISSING_PLAN',
      message: `Plan file '${config.plan_file}' not found.`,
    });
    return { exists: false, valid: false, violations };
  }

  const content = fs.readFileSync(planPath, 'utf-8');
  let valid = true;

  for (const section of config.required_sections) {
    const pattern = new RegExp(`(^|\\n)#+\\s*${section}|${section}:`, 'i');
    if (!pattern.test(content)) {
      violations.push({
        rule: 'INVALID_PLAN',
        message: `Plan missing required section: '${section}'`,
        file: config.plan_file,
      });
      valid = false;
    }
  }

  return { exists: true, valid, violations };
}

function checkFiles(files: string[], config: Config): { clean: boolean; violations: Violation[] } {
  const violations: Violation[] = [];

  // Max Files Check
  if (config.max_files && files.length > config.max_files) {
     violations.push({
       rule: 'TOO_MANY_FILES',
       message: `PR touches ${files.length} files (limit: ${config.max_files}). Large agentic PRs require special justification in PLAN.md.`,
     });
  }

  if (config.check_todos) {
    for (const file of files) {
      try {
        if (!fs.existsSync(file)) continue;
        const stat = fs.statSync(file);
        if (!stat.isFile()) continue;

        const content = fs.readFileSync(file, 'utf-8');
        const lines = content.split('\n');

        lines.forEach((line, index) => {
          for (const pattern of config.todo_patterns) {
            if (line.includes(pattern)) {
              violations.push({
                rule: 'LEFTOVER_TODO',
                message: `Found '${pattern}' in code`,
                file: file,
                line: index + 1,
              });
            }
          }
        });
      } catch (e) {
        console.warn(`Could not check file ${file}:`, e);
      }
    }
  }

  return { clean: violations.length === 0, violations };
}

async function main() {
  const args = process.argv.slice(2);
  const files = args.filter(arg => !arg.startsWith('--'));

  const config = loadConfig();

  // If mode is off, still generate a dummy report to satisfy artifact requirements
  if (config.mode === 'off') {
    console.log('Agentic Plan Gate is OFF.');
     const report: Report = {
        status: 'pass',
        checks: { plan_exists: true, plan_valid: true, clean_code: true },
        violations: [],
        metadata: {
            timestamp: new Date().toISOString(),
            files_checked: files.length,
            config_mode: config.mode,
        },
        skipped: true
      };
      writeReportAndExit(report, 0);
      return;
  }

  console.log(`Running Agentic Plan Gate (Mode: ${config.mode})...`);

  // Label Enforcement Logic
  const labelsEnv = process.env.PR_LABELS || '';
  const currentLabels = labelsEnv.split(',').map(l => l.trim()).filter(Boolean);

  if (config.agent_labels && config.agent_labels.length > 0) {
    const hasAgentLabel = config.agent_labels.some(label => currentLabels.includes(label));
    if (!hasAgentLabel) {
      console.log('Skipping Agentic Plan Gate (PR labels do not match configured agent_labels).');
       const report: Report = {
        status: 'pass',
        checks: { plan_exists: true, plan_valid: true, clean_code: true }, // dummy pass
        violations: [],
        metadata: {
            timestamp: new Date().toISOString(),
            files_checked: files.length,
            config_mode: config.mode,
        },
        skipped: true
      };
      writeReportAndExit(report, 0);
      return;
    }
  }

  const planResult = checkPlan(config);
  const fileResult = checkFiles(files, config);

  const allViolations = [...planResult.violations, ...fileResult.violations];

  let status: Report['status'] = 'pass';
  if (allViolations.length > 0) {
    status = config.mode === 'strict' ? 'fail' : 'warn';
  }

  const report: Report = {
    status,
    checks: {
      plan_exists: planResult.exists,
      plan_valid: planResult.valid,
      clean_code: fileResult.clean,
    },
    violations: allViolations,
    metadata: {
      timestamp: new Date().toISOString(),
      files_checked: files.length,
      config_mode: config.mode,
    },
  };

  const exitCode = status === 'fail' ? 1 : 0;
  if (status === 'fail') console.error('Agentic Plan Gate FAILED.');
  else console.log('Agentic Plan Gate PASSED (or WARNED).');

  writeReportAndExit(report, exitCode);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});

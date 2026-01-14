/* eslint-disable no-console */
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import yaml from 'js-yaml';

type EvidenceStatus = 'passed' | 'failed' | 'skipped' | 'missing';

type ControlMapping = {
  id: string;
  name: string;
  category: string;
  description?: string;
  evidence_scripts?: string[];
};

type EvidenceResult = {
  script: string;
  status: EvidenceStatus;
  outputPath?: string;
  message?: string;
};

type ControlResult = {
  id: string;
  name: string;
  category: string;
  status: 'PASS' | 'FAIL' | 'UNKNOWN' | 'DEFERRED';
  evidence: EvidenceResult[];
  exception?: string;
};

type ComplianceReport = {
  generatedAt: string;
  reportPath: string;
  controls: ControlResult[];
};

const DEFAULT_MATRIX_PATH = 'compliance/control-matrix.yml';
const EXCEPTIONS_PATH = 'compliance/exceptions/EXCEPTIONS.yml';

type Exception = {
  exception_id: string;
  control_ids: string[];
  status: string;
  expires_at_utc: string;
};

function loadExceptions(exceptionsPath: string): Exception[] {
  if (!existsSync(exceptionsPath)) {
    return [];
  }
  const raw = readFileSync(exceptionsPath, 'utf-8');
  const parsed = yaml.load(raw) as Exception[];
  return Array.isArray(parsed) ? parsed : [];
}

function parseArgs(): { outputPath: string; markdownPath?: string } {
  const args = process.argv.slice(2);
  const today = new Date();
  const dateStamp = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;
  let outputPath = path.join('artifacts', `compliance-report-${dateStamp}.json`);
  let markdownPath: string | undefined;

  for (let i = 0; i < args.length; i += 1) {
    if (args[i] === '--output' && args[i + 1]) {
      outputPath = args[i + 1];
      i += 1;
    } else if (args[i] === '--markdown' && args[i + 1]) {
      markdownPath = args[i + 1];
      i += 1;
    }
  }

  return { outputPath, markdownPath };
}

function loadControlMatrix(matrixPath: string): ControlMapping[] {
  if (!existsSync(matrixPath)) {
    throw new Error(`Control matrix not found at ${matrixPath}`);
  }

  const raw = readFileSync(matrixPath, 'utf-8');
  const parsed = yaml.load(raw) as { controls?: ControlMapping[] };

  if (!parsed?.controls || !Array.isArray(parsed.controls)) {
    throw new Error('Invalid control matrix format: expected "controls" array');
  }

  return parsed.controls;
}

function ensureDir(targetPath: string) {
  mkdirSync(targetPath, { recursive: true });
}

function sanitizeId(id: string): string {
  return id.toLowerCase().replace(/[^a-z0-9]+/g, '-');
}

function runEvidenceScript(controlId: string, scriptPath: string, logDir: string): EvidenceResult {
  if (!existsSync(scriptPath)) {
    return { script: scriptPath, status: 'missing', message: 'Script not found' };
  }

  if (scriptPath.startsWith('.github/workflows') || scriptPath.endsWith('.yml') || scriptPath.endsWith('.yaml')) {
    return { script: scriptPath, status: 'skipped', message: 'Workflow reference captured (not executable in runner)' };
  }

  const safeId = sanitizeId(controlId);
  const scriptName = path.basename(scriptPath).replace(/\.[^.]+$/, '');
  const logPath = path.join(logDir, `${safeId}-${scriptName}.log`);
  const execution = spawnSync(scriptPath, {
    shell: true,
    encoding: 'utf-8',
  });

  ensureDir(path.dirname(logPath));
  const combinedOutput = `${execution.stdout ?? ''}${execution.stderr ?? ''}`;
  writeFileSync(logPath, combinedOutput, 'utf-8');

  const status: EvidenceStatus = execution.status === 0 ? 'passed' : 'failed';
  return {
    script: scriptPath,
    status,
    outputPath: logPath,
    message: execution.status === 0 ? 'Completed successfully' : execution.stderr || execution.stdout,
  };
}

function evaluateControl(control: ControlMapping, logDir: string, exceptions: Exception[]): ControlResult {
  const evidenceScripts = control.evidence_scripts ?? [];

  // Find active exception for this control
  const now = new Date();
  const activeException = exceptions.find(ex =>
    ex.control_ids.includes(control.id) &&
    ex.status === 'active' &&
    new Date(ex.expires_at_utc) > now
  );

  if (evidenceScripts.length === 0) {
     if (activeException) {
       return { id: control.id, name: control.name, category: control.category, status: 'DEFERRED', evidence: [], exception: activeException.exception_id };
     }
    return { id: control.id, name: control.name, category: control.category, status: 'UNKNOWN', evidence: [] };
  }

  const evidenceResults = evidenceScripts.map((script) => runEvidenceScript(control.id, script, logDir));
  const hasFailure = evidenceResults.some((result) => result.status === 'failed' || result.status === 'missing');
  const hasPass = evidenceResults.some((result) => result.status === 'passed');
  const allSkipped = evidenceResults.every((result) => result.status === 'skipped');

  let status: ControlResult['status'] = 'UNKNOWN';
  if (hasFailure) {
    if (activeException) {
      status = 'DEFERRED';
    } else {
      status = 'FAIL';
    }
  } else if (hasPass) {
    status = 'PASS';
  } else if (allSkipped) {
    status = 'UNKNOWN';
  }

  return {
    id: control.id,
    name: control.name,
    category: control.category,
    status,
    evidence: evidenceResults,
    exception: activeException ? activeException.exception_id : undefined
  };
}

function writeMarkdown(report: ComplianceReport, markdownPath: string) {
  const lines = ['# Compliance Check Summary', '', `Generated: ${report.generatedAt}`, '', '| Control | Status | Evidence | Exception |', '| --- | --- | --- | --- |'];

  report.controls.forEach((control) => {
    const evidenceList = control.evidence
      .map((item) => `${item.script} (${item.status}${item.outputPath ? ` → ${item.outputPath}` : ''})`)
      .join('<br>');
    const exceptionLink = control.exception ? `**${control.exception}**` : '';
    lines.push(`| ${control.id} — ${control.name} | ${control.status} | ${evidenceList || 'None'} | ${exceptionLink} |`);
  });

  ensureDir(path.dirname(markdownPath));
  writeFileSync(markdownPath, lines.join('\n'), 'utf-8');
}

function generateReport(matrixPath: string, outputPath: string, markdownPath?: string) {
  const controls = loadControlMatrix(matrixPath);
  const exceptions = loadExceptions(EXCEPTIONS_PATH);

  const logDir = path.join(path.dirname(outputPath), 'compliance-logs');
  ensureDir(logDir);
  ensureDir(path.dirname(outputPath));

  const results = controls.map((control) => evaluateControl(control, logDir, exceptions));
  const report: ComplianceReport = {
    generatedAt: new Date().toISOString(),
    reportPath: path.resolve(outputPath),
    controls: results,
  };

  writeFileSync(outputPath, JSON.stringify(report, null, 2), 'utf-8');

  if (markdownPath) {
    writeMarkdown(report, markdownPath);
  }

  console.log(`Compliance report written to ${outputPath}`);
  if (markdownPath) {
    console.log(`Markdown summary written to ${markdownPath}`);
  }
}

function main() {
  const { outputPath, markdownPath } = parseArgs();
  generateReport(DEFAULT_MATRIX_PATH, outputPath, markdownPath);
}

try {
  main();
} catch (error) {
  const message = error instanceof Error ? error.message : 'Unknown error';
  console.error(`Compliance check failed: ${message}`);
  process.exitCode = 1;
}

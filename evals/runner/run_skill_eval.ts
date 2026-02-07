/* eslint-disable no-console */
import fs from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import yaml from 'js-yaml';
import { ensureDir, writeJson } from './filesystem.js';
import { parsePromptsCsv } from './csv.js';
import {
  CaseResult,
  PromptCase,
  SkillRunConfig,
  TraceEvent,
  DeterministicResult,
  RubricResult,
} from './types.js';
import { parseTrace } from './parse_trace.js';
import {
  combineScores,
  loadBaselineScore,
  persistScore,
  persistScoreHistory,
} from './score.js';
import { writeJUnitReport, writeMarkdownReport } from './report.js';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

const nowIso = () => new Date().toISOString();

const parseArgs = (): { skill: string; runId: string } => {
  const args = process.argv.slice(2);
  const skillIndex = args.indexOf('--skill');
  const runIndex = args.indexOf('--run-id');
  if (skillIndex === -1 || !args[skillIndex + 1]) {
    throw new Error('Missing --skill argument');
  }
  return {
    skill: args[skillIndex + 1],
    runId:
      runIndex !== -1 && args[runIndex + 1]
        ? args[runIndex + 1]
        : `run-${Date.now()}`,
  };
};

const runCommand = async (
  command: string[],
  env: NodeJS.ProcessEnv,
  timeoutMs: number,
  stdoutPath: string,
  stderrPath: string,
): Promise<{ exitCode: number | null; durationMs: number }> => {
  const [bin, ...args] = command;
  await ensureDir(path.dirname(stdoutPath));
  const stdout = await fs.open(stdoutPath, 'w');
  const stderr = await fs.open(stderrPath, 'w');
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const child = spawn(bin, args, {
      cwd: repoRoot,
      env,
      stdio: ['ignore', stdout.createWriteStream(), stderr.createWriteStream()],
    });
    const timer = setTimeout(() => {
      child.kill('SIGTERM');
    }, timeoutMs);
    child.on('error', (error) => {
      clearTimeout(timer);
      reject(error);
    });
    child.on('close', (code) => {
      clearTimeout(timer);
      const durationMs = Date.now() - start;
      resolve({ exitCode: code, durationMs });
    });
  }).finally(async () => {
    await stdout.close();
    await stderr.close();
  });
};

const runGitStatus = (): Promise<string[]> => {
  return new Promise((resolve, reject) => {
    const child = spawn('git', ['status', '--porcelain=v1'], {
      cwd: repoRoot,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let output = '';
    let errorOutput = '';
    child.stdout.on('data', (data) => {
      output += data.toString();
    });
    child.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });
    child.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(errorOutput || 'git status failed'));
      } else {
        resolve(
          output
            .split(/\r?\n/)
            .filter((line) => line.trim().length > 0),
        );
      }
    });
  });
};

const loadConfig = async (skill: string): Promise<SkillRunConfig> => {
  const configPath = path.join(
    repoRoot,
    'evals',
    'skills',
    skill,
    'configs',
    'run.yaml',
  );
  const raw = await fs.readFile(configPath, 'utf8');
  return yaml.load(raw) as SkillRunConfig;
};

const loadPrompts = async (skill: string): Promise<PromptCase[]> => {
  const promptsPath = path.join(
    repoRoot,
    'evals',
    'skills',
    skill,
    'prompts.csv',
  );
  const raw = await fs.readFile(promptsPath, 'utf8');
  return parsePromptsCsv(raw);
};

const buildTraceWriter = async (tracePath: string) => {
  await ensureDir(path.dirname(tracePath));
  const stream = await fs.open(tracePath, 'w');
  return {
    write: async (event: TraceEvent) => {
      await stream.write(`${JSON.stringify(event)}\n`);
    },
    close: async () => {
      await stream.close();
    },
  };
};

const runCase = async (
  skill: string,
  runId: string,
  promptCase: PromptCase,
  config: SkillRunConfig,
  traceWriter: { write: (event: TraceEvent) => Promise<void> },
  artifactDir: string,
): Promise<CaseResult> => {
  await ensureDir(artifactDir);
  await traceWriter.write({
    ts: nowIso(),
    event_type: 'case_start',
    run_id: runId,
    skill,
    prompt_id: promptCase.id,
    data: {
      prompt: promptCase.prompt,
      expected_trigger: promptCase.expected_trigger,
      tags: promptCase.tags,
    },
  });
  const gitBefore = await runGitStatus();
  await traceWriter.write({
    ts: nowIso(),
    event_type: 'command_start',
    run_id: runId,
    skill,
    prompt_id: promptCase.id,
    data: {
      command: config.command,
    },
  });
  const { exitCode, durationMs } = await runCommand(
    config.command,
    {
      ...process.env,
      SKILL_PROMPT: promptCase.prompt,
      SKILL_CASE_ID: promptCase.id,
      SKILL_OUTPUT_DIR: artifactDir,
    },
    config.timeout_ms,
    path.join(artifactDir, 'stdout.log'),
    path.join(artifactDir, 'stderr.log'),
  );
  await traceWriter.write({
    ts: nowIso(),
    event_type: 'command_end',
    run_id: runId,
    skill,
    prompt_id: promptCase.id,
    data: {
      exit_code: exitCode,
      duration_ms: durationMs,
    },
  });
  const gitAfter = await runGitStatus();
  const fileChanges = gitAfter.filter((line) => !gitBefore.includes(line));
  await traceWriter.write({
    ts: nowIso(),
    event_type: 'file_changes',
    run_id: runId,
    skill,
    prompt_id: promptCase.id,
    data: {
      changes: fileChanges,
    },
  });
  await traceWriter.write({
    ts: nowIso(),
    event_type: 'case_end',
    run_id: runId,
    skill,
    prompt_id: promptCase.id,
    data: {
      exit_code: exitCode,
      duration_ms: durationMs,
    },
  });

  return {
    id: promptCase.id,
    success: exitCode === 0,
    duration_ms: durationMs,
    exit_code: exitCode,
    artifact_dir: artifactDir,
  };
};

const loadModule = <T>(modulePath: string): Promise<T> => {
  const absolute = path.resolve(repoRoot, modulePath);
  return import(pathToFileURL(absolute).href) as Promise<T>;
};

type GradeDeterministic = (input: {
  trace: TraceEvent[];
  prompts: PromptCase[];
  skillDir: string;
  repoRoot: string;
}) => DeterministicResult;

const runDeterministicGrader = async (
  config: SkillRunConfig,
  tracePath: string,
  skillDir: string,
  prompts: PromptCase[],
): Promise<DeterministicResult> => {
  const module = await loadModule<{ grade: GradeDeterministic }>(
    config.deterministic_grader,
  );
  const trace = await parseTrace(tracePath);
  return module.grade({ trace, prompts, skillDir, repoRoot });
};

type GradeRubric = (input: {
  trace: TraceEvent[];
  skillDir: string;
  repoRoot: string;
}) => RubricResult;

const runRubricGrader = async (
  config: SkillRunConfig,
  tracePath: string,
  skillDir: string,
): Promise<RubricResult> => {
  const module = await loadModule<{ grade: GradeRubric }>(config.rubric.grader);
  const trace = await parseTrace(tracePath);
  return module.grade({ trace, skillDir, repoRoot });
};

const run = async () => {
  const { skill, runId } = parseArgs();
  const config = await loadConfig(skill);
  const prompts = await loadPrompts(skill);
  const skillDir = path.join(repoRoot, 'evals', 'skills', skill);
  const artifactRoot = path.join(skillDir, 'artifacts', runId);
  await ensureDir(artifactRoot);

  const tracePath = path.join(artifactRoot, 'trace.jsonl');
  const traceWriter = await buildTraceWriter(tracePath);
  await traceWriter.write({
    ts: nowIso(),
    event_type: 'run_start',
    run_id: runId,
    skill,
    data: {
      prompt_count: prompts.length,
      config,
    },
  });

  const caseResults: CaseResult[] = [];
  for (const promptCase of prompts) {
    const caseArtifactDir = path.join(artifactRoot, promptCase.id);
    const result = await runCase(
      skill,
      runId,
      promptCase,
      config,
      traceWriter,
      caseArtifactDir,
    );
    caseResults.push(result);
  }

  await traceWriter.write({
    ts: nowIso(),
    event_type: 'run_end',
    run_id: runId,
    skill,
    data: {
      cases: caseResults,
    },
  });
  await traceWriter.close();

  const deterministic = await runDeterministicGrader(
    config,
    tracePath,
    skillDir,
    prompts,
  );
  const rubric = await runRubricGrader(config, tracePath, skillDir);

  const baselinePath = path.join(skillDir, 'baselines', 'score.json');
  const baselineScore = await loadBaselineScore(baselinePath);
  const summary = combineScores(
    skill,
    runId,
    deterministic,
    rubric,
    baselineScore,
    5,
  );

  const deterministicPath = path.join(artifactRoot, 'deterministic.json');
  const rubricPath = path.join(artifactRoot, 'rubric.json');
  const scorePath = path.join(artifactRoot, 'score.json');
  await writeJson(deterministicPath, deterministic);
  await writeJson(rubricPath, rubric);
  await persistScore(scorePath, summary);
  await persistScoreHistory(path.join(skillDir, 'baselines'), runId, summary);

  await writeMarkdownReport(path.join(artifactRoot, 'report.md'), summary);
  await writeJUnitReport(path.join(artifactRoot, 'report.junit.xml'), summary);

  const summaryIndexPath = path.join(skillDir, 'artifacts', 'latest.json');
  await writeJson(summaryIndexPath, summary);

  console.log(`Eval skill ${skill} completed with score ${summary.combined_score}.`);
};

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const promises_1 = __importDefault(require("node:fs/promises"));
const node_path_1 = __importDefault(require("node:path"));
const node_child_process_1 = require("node:child_process");
const node_url_1 = require("node:url");
const js_yaml_1 = __importDefault(require("js-yaml"));
const filesystem_js_1 = require("./filesystem.js");
const csv_js_1 = require("./csv.js");
const parse_trace_js_1 = require("./parse_trace.js");
const score_js_1 = require("./score.js");
const report_js_1 = require("./report.js");
const repoRoot = node_path_1.default.resolve(node_path_1.default.dirname((0, node_url_1.fileURLToPath)(import.meta.url)), '../..');
const nowIso = () => new Date().toISOString();
const parseArgs = () => {
    const args = process.argv.slice(2);
    const skillIndex = args.indexOf('--skill');
    const runIndex = args.indexOf('--run-id');
    if (skillIndex === -1 || !args[skillIndex + 1]) {
        throw new Error('Missing --skill argument');
    }
    return {
        skill: args[skillIndex + 1],
        runId: runIndex !== -1 && args[runIndex + 1]
            ? args[runIndex + 1]
            : `run-${Date.now()}`,
    };
};
const runCommand = async (command, env, timeoutMs, stdoutPath, stderrPath) => {
    const [bin, ...args] = command;
    await (0, filesystem_js_1.ensureDir)(node_path_1.default.dirname(stdoutPath));
    const stdout = await promises_1.default.open(stdoutPath, 'w');
    const stderr = await promises_1.default.open(stderrPath, 'w');
    const start = Date.now();
    return new Promise((resolve, reject) => {
        const child = (0, node_child_process_1.spawn)(bin, args, {
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
const runGitStatus = async () => {
    return new Promise((resolve, reject) => {
        const child = (0, node_child_process_1.spawn)('git', ['status', '--porcelain=v1'], {
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
            }
            else {
                resolve(output
                    .split(/\r?\n/)
                    .filter((line) => line.trim().length > 0));
            }
        });
    });
};
const loadConfig = async (skill) => {
    const configPath = node_path_1.default.join(repoRoot, 'evals', 'skills', skill, 'configs', 'run.yaml');
    const raw = await promises_1.default.readFile(configPath, 'utf8');
    return js_yaml_1.default.load(raw);
};
const loadPrompts = async (skill) => {
    const promptsPath = node_path_1.default.join(repoRoot, 'evals', 'skills', skill, 'prompts.csv');
    const raw = await promises_1.default.readFile(promptsPath, 'utf8');
    return (0, csv_js_1.parsePromptsCsv)(raw);
};
const buildTraceWriter = async (tracePath) => {
    await (0, filesystem_js_1.ensureDir)(node_path_1.default.dirname(tracePath));
    const stream = await promises_1.default.open(tracePath, 'w');
    return {
        write: async (event) => {
            await stream.write(`${JSON.stringify(event)}\n`);
        },
        close: async () => {
            await stream.close();
        },
    };
};
const runCase = async (skill, runId, promptCase, config, traceWriter, artifactDir) => {
    const caseStart = Date.now();
    await (0, filesystem_js_1.ensureDir)(artifactDir);
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
    const { exitCode, durationMs } = await runCommand(config.command, {
        ...process.env,
        SKILL_PROMPT: promptCase.prompt,
        SKILL_CASE_ID: promptCase.id,
        SKILL_OUTPUT_DIR: artifactDir,
    }, config.timeout_ms, node_path_1.default.join(artifactDir, 'stdout.log'), node_path_1.default.join(artifactDir, 'stderr.log'));
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
const loadModule = async (modulePath) => {
    const absolute = node_path_1.default.resolve(repoRoot, modulePath);
    return Promise.resolve(`${(0, node_url_1.pathToFileURL)(absolute).href}`).then(s => __importStar(require(s)));
};
const runDeterministicGrader = async (config, tracePath, skillDir, prompts) => {
    const module = await loadModule(config.deterministic_grader);
    const trace = await (0, parse_trace_js_1.parseTrace)(tracePath);
    return module.grade({ trace, prompts, skillDir, repoRoot });
};
const runRubricGrader = async (config, tracePath, skillDir) => {
    const module = await loadModule(config.rubric.grader);
    const trace = await (0, parse_trace_js_1.parseTrace)(tracePath);
    return module.grade({ trace, skillDir, repoRoot });
};
const run = async () => {
    const { skill, runId } = parseArgs();
    const config = await loadConfig(skill);
    const prompts = await loadPrompts(skill);
    const skillDir = node_path_1.default.join(repoRoot, 'evals', 'skills', skill);
    const artifactRoot = node_path_1.default.join(skillDir, 'artifacts', runId);
    await (0, filesystem_js_1.ensureDir)(artifactRoot);
    const tracePath = node_path_1.default.join(artifactRoot, 'trace.jsonl');
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
    const caseResults = [];
    for (const promptCase of prompts) {
        const caseArtifactDir = node_path_1.default.join(artifactRoot, promptCase.id);
        const result = await runCase(skill, runId, promptCase, config, traceWriter, caseArtifactDir);
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
    const deterministic = await runDeterministicGrader(config, tracePath, skillDir, prompts);
    const rubric = await runRubricGrader(config, tracePath, skillDir);
    const baselinePath = node_path_1.default.join(skillDir, 'baselines', 'score.json');
    const baselineScore = await (0, score_js_1.loadBaselineScore)(baselinePath);
    const summary = (0, score_js_1.combineScores)(skill, runId, deterministic, rubric, baselineScore, 5);
    const deterministicPath = node_path_1.default.join(artifactRoot, 'deterministic.json');
    const rubricPath = node_path_1.default.join(artifactRoot, 'rubric.json');
    const scorePath = node_path_1.default.join(artifactRoot, 'score.json');
    await (0, filesystem_js_1.writeJson)(deterministicPath, deterministic);
    await (0, filesystem_js_1.writeJson)(rubricPath, rubric);
    await (0, score_js_1.persistScore)(scorePath, summary);
    await (0, score_js_1.persistScoreHistory)(node_path_1.default.join(skillDir, 'baselines'), runId, summary);
    await (0, report_js_1.writeMarkdownReport)(node_path_1.default.join(artifactRoot, 'report.md'), summary);
    await (0, report_js_1.writeJUnitReport)(node_path_1.default.join(artifactRoot, 'report.junit.xml'), summary);
    const summaryIndexPath = node_path_1.default.join(skillDir, 'artifacts', 'latest.json');
    await (0, filesystem_js_1.writeJson)(summaryIndexPath, summary);
    console.log(`Eval skill ${skill} completed with score ${summary.combined_score}.`);
};
run().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});

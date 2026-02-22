import fs from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import {
  ContextShell,
  ContextShellOptions,
  ContextShellResult,
  ContextShellToolName,
  ToolCall,
} from './types.js';
import {
  DEFAULT_LIMITS,
  DEFAULT_REDACTIONS,
  applyRedactions,
  clampOutput,
  hashValue,
  normalizePath,
  stableStringify,
  toPosixPath,
} from './utils.js';
import { createDefaultPolicy } from './policy.js';
import { EvidenceLogger } from './evidence.js';

const DEFAULT_EVIDENCE_DIR = path.join(process.cwd(), 'evidence', 'context-shell');

type ExecutionOutput = {
  result: ContextShellResult;
  policyDecisionId?: string;
  normalizedCommand?: string;
};

export function createContextShell(options: ContextShellOptions): ContextShell {
  const policy = options.policy ?? createDefaultPolicy();
  const limits = { ...DEFAULT_LIMITS, ...options.limits };
  const redactions = options.redactions ?? DEFAULT_REDACTIONS;
  const fsMode = options.fsMode ?? 'overlay';
  const cache = options.cache ?? createInMemoryCache();
  const hooks = options.hooks;
  const root = path.resolve(options.root);
  const now = options.now ?? Date.now;
  const traceId = options.traceId ?? randomUUID();
  const evidenceEnabled = options.evidence?.enabled ?? true;
  const evidenceDir = options.evidence?.dir ?? DEFAULT_EVIDENCE_DIR;
  const evidenceLogger = evidenceEnabled
    ? new EvidenceLogger({ dir: evidenceDir, traceId, now })
    : undefined;
  const overlay = new Map<string, string>();
  let toolCalls = 0;

  async function runTool(
    tool: ContextShellToolName,
    call: ToolCall,
    executor: (updatedCall: ToolCall) => Promise<ExecutionOutput>
  ): Promise<ContextShellResult> {
    toolCalls += 1;
    if (toolCalls > limits.maxSteps) {
      return buildErrorResult('Tool call limit exceeded', []);
    }

    const start = now();
    const updatedCall = hooks?.onBeforeCall
      ? await hooks.onBeforeCall(call)
      : call;

    const cacheKey = buildCacheKey(
      tool,
      updatedCall,
      policy,
      options.repoSha ?? 'unknown'
    );

    const cacheHit = tool !== 'ctx.writeFile' && cache.get(cacheKey);
    if (cacheHit) {
      const cached = cache.get(cacheKey);
      if (cached) {
        const cachedResult = { ...cached, durationMs: 0 };
        evidenceLogger?.logStart(tool, {
          cacheKey,
          cacheHit: true,
          inputHash: hashValue(stableStringify(updatedCall.metadata ?? {})),
        });
        evidenceLogger?.logEnd(tool, cachedResult, {
          cacheKey,
          cacheHit: true,
        });
        return cachedResult;
      }
    }

    evidenceLogger?.logStart(tool, {
      cacheKey,
      inputHash: hashValue(stableStringify(updatedCall.metadata ?? {})),
    });

    let execution: ExecutionOutput;
    try {
      execution = await executor(updatedCall);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      execution = { result: buildErrorResult(message, []) };
    }

    const result = execution.result;
    const durationMs = now() - start;
    const resultWithDuration = { ...result, durationMs };

    const finalResult = hooks?.onAfterCall
      ? await hooks.onAfterCall(updatedCall, resultWithDuration)
      : resultWithDuration;

    evidenceLogger?.logEnd(tool, finalResult, {
      cacheKey,
      policyId: policy.id,
      policyVersion: policy.version,
      policyDecisionId: execution.policyDecisionId,
      normalizedCommand: execution.normalizedCommand,
      limits,
    });

    if (tool !== 'ctx.writeFile') {
      cache.set(cacheKey, finalResult);
    }

    return finalResult;
  }

  return {
    async bash(command: string) {
      const parsed = parseCommand(command);
      const call: ToolCall = {
        tool: 'ctx.bash',
        command: parsed?.name ?? command,
        args: parsed?.args ?? [],
        metadata: { command },
      };
      return runTool('ctx.bash', call, async (updatedCall) => {
        const rawCommand =
          typeof updatedCall.metadata?.command === 'string'
            ? updatedCall.metadata.command
            : command;
        const updatedParsed = parseCommand(rawCommand);
        if (!updatedParsed) {
          return { result: buildErrorResult('Empty command', []) };
        }
        if (
          rawCommand.includes('|') ||
          rawCommand.includes('&&') ||
          rawCommand.includes(';')
        ) {
          return { result: buildErrorResult('Pipes and chaining are not allowed', []) };
        }

        const { name, args } = updatedParsed;
        const targetPath = extractPathArg(args);
        const decision = policy.evaluate({
          tool: 'ctx.bash',
          command: name,
          args,
          path: targetPath ?? undefined,
        });
        if (!decision.allowed) {
          return {
            result: buildPolicyDenied(decision),
            policyDecisionId: decision.decisionId,
            normalizedCommand: formatCommand(name, args),
          };
        }

        const normalizedCommand = formatCommand(name, args);
        switch (name) {
          case 'pwd':
            return {
              result: buildSuccessResult(root, [], []),
              policyDecisionId: decision.decisionId,
              normalizedCommand,
            };
          case 'ls':
            return {
              result: await executeLs(root, args, policy, limits),
              policyDecisionId: decision.decisionId,
              normalizedCommand,
            };
          case 'cat':
            if (!targetPath) {
              return { result: buildErrorResult('cat requires a path', []) };
            }
            return {
              result: await executeCat(
                root,
                targetPath,
                policy,
                redactions,
                limits,
                overlay,
                fsMode
              ),
              policyDecisionId: decision.decisionId,
              normalizedCommand,
            };
          case 'rg':
            return {
              result: await executeRg(
                root,
                args,
                now,
                policy,
                redactions,
                limits,
                overlay,
                fsMode
              ),
              policyDecisionId: decision.decisionId,
              normalizedCommand,
            };
          default:
            return {
              result: buildErrorResult(`Unsupported command: ${name}`, []),
              policyDecisionId: decision.decisionId,
              normalizedCommand,
            };
        }
      });
    },
    async readFile(filePath: string) {
      const call: ToolCall = {
        tool: 'ctx.readFile',
        path: filePath,
        metadata: { path: filePath },
      };
      return runTool('ctx.readFile', call, async (updatedCall) => {
        const targetPath = updatedCall.path ?? filePath;
        const decision = policy.evaluate({ tool: 'ctx.readFile', path: targetPath });
        if (!decision.allowed) {
          return { result: buildPolicyDenied(decision), policyDecisionId: decision.decisionId };
        }
        const resolved = normalizePath(root, targetPath);
        const content = await readFileScoped(resolved, overlay, fsMode, limits.maxFileBytes);
        const redacted = applyRedactions(content, redactions);
        const output = clampOutput(redacted.value, limits.maxOutputBytes);
        const applied = [...redacted.applied];
        if (output.truncated) {
          applied.push('output_truncated');
        }
        return {
          result: buildSuccessResult(output.value, [resolved], [], applied),
          policyDecisionId: decision.decisionId,
        };
      });
    },
    async writeFile(filePath: string, content: string, options = {}) {
      const call: ToolCall = {
        tool: 'ctx.writeFile',
        path: filePath,
        content,
        metadata: { path: filePath, contentHash: hashValue(content) },
      };
      return runTool('ctx.writeFile', call, async (updatedCall) => {
        const targetPath = updatedCall.path ?? filePath;
        const targetContent = updatedCall.content ?? content;
        const decision = policy.evaluate({
          tool: 'ctx.writeFile',
          path: targetPath,
          justification: options.justification,
          format: options.format,
        });
        if (!decision.allowed) {
          return { result: buildPolicyDenied(decision), policyDecisionId: decision.decisionId };
        }
        const resolved = normalizePath(root, targetPath);
        await writeFileScoped(resolved, targetContent, overlay, fsMode);
        return {
          result: buildSuccessResult('', [], [resolved]),
          policyDecisionId: decision.decisionId,
        };
      });
    },
  };
}

function parseCommand(command: string): { name: string; args: string[] } | null {
  const tokens = tokenize(command);
  if (tokens.length === 0) {
    return null;
  }
  return { name: tokens[0], args: tokens.slice(1) };
}

function tokenize(command: string): string[] {
  const tokens: string[] = [];
  let current = '';
  let quote: 'single' | 'double' | null = null;

  for (let i = 0; i < command.length; i += 1) {
    const char = command[i];
    if (quote) {
      if ((quote === 'single' && char === "'") || (quote === 'double' && char === '"')) {
        quote = null;
      } else {
        current += char;
      }
      continue;
    }

    if (char === "'") {
      quote = 'single';
      continue;
    }
    if (char === '"') {
      quote = 'double';
      continue;
    }

    if (char === ' ' || char === '\n' || char === '\t') {
      if (current) {
        tokens.push(current);
        current = '';
      }
      continue;
    }

    current += char;
  }

  if (current) {
    tokens.push(current);
  }
  return tokens;
}

function extractPathArg(args: string[]): string | null {
  const pathArg = args.find((arg) => !arg.startsWith('-'));
  return pathArg ?? null;
}

function formatCommand(name: string, args: string[]): string {
  return [name, ...args].join(' ').trim();
}

async function executeLs(
  root: string,
  args: string[],
  policy: ContextShellOptions['policy'],
  limits: { maxOutputBytes: number }
): Promise<ContextShellResult> {
  const showHidden = args.includes('-a');
  const pathArg = extractPathArg(args) ?? '.';
  const resolved = normalizePath(root, pathArg);
  const decision = policy?.evaluate({ tool: 'ctx.readFile', path: resolved });
  if (decision && !decision.allowed) {
    return buildPolicyDenied(decision);
  }
  const entries = await fs.readdir(resolved, { withFileTypes: true });
  const names = entries
    .map((entry) => entry.name)
    .filter((name) => showHidden || !name.startsWith('.'))
    .sort();
  const output = clampOutput(names.join('\n'), limits.maxOutputBytes);
  const applied = output.truncated ? ['output_truncated'] : [];
  return buildSuccessResult(output.value, [resolved], [], applied);
}

async function executeCat(
  root: string,
  filePath: string,
  policy: ContextShellOptions['policy'],
  redactions: Array<{ id: string; pattern: RegExp; replacement?: string }>,
  limits: {
    maxOutputBytes: number;
    maxFileBytes: number;
  },
  overlay: Map<string, string>,
  fsMode: string
): Promise<ContextShellResult> {
  const decision = policy?.evaluate({ tool: 'ctx.readFile', path: filePath });
  if (decision && !decision.allowed) {
    return buildPolicyDenied(decision);
  }
  const resolved = normalizePath(root, filePath);
  const content = await readFileScoped(resolved, overlay, fsMode, limits.maxFileBytes);
  const redacted = applyRedactions(content, redactions);
  const output = clampOutput(redacted.value, limits.maxOutputBytes);
  const applied = [...redacted.applied];
  if (output.truncated) {
    applied.push('output_truncated');
  }
  return buildSuccessResult(output.value, [resolved], [], applied);
}

async function executeRg(
  root: string,
  args: string[],
  now: () => number,
  policy: ContextShellOptions['policy'],
  redactions: Array<{ id: string; pattern: RegExp; replacement?: string }>,
  limits: {
    maxOutputBytes: number;
    maxFileBytes: number;
    maxExecMs: number;
    maxSteps: number;
  },
  overlay: Map<string, string>,
  fsMode: string
): Promise<ContextShellResult> {
  const start = now();
  const patternArg = args.find((arg) => !arg.startsWith('-'));
  const pathArg = args.filter((arg) => !arg.startsWith('-'))[1] ?? '.';
  if (!patternArg) {
    return buildErrorResult('rg requires a pattern', []);
  }

  const decision = policy?.evaluate({
    tool: 'ctx.bash',
    command: 'rg',
    args,
    path: pathArg,
  });
  if (decision && !decision.allowed) {
    return buildPolicyDenied(decision);
  }

  let regex: RegExp;
  try {
    regex = new RegExp(patternArg, 'g');
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Invalid regex';
    return buildErrorResult(message, []);
  }

  const resolvedRoot = normalizePath(root, pathArg);
  const files: string[] = [];
  const stat = await fs.stat(resolvedRoot);
  if (stat.isFile()) {
    files.push(resolvedRoot);
  } else {
    await walkFiles(resolvedRoot, files, limits, now, start, 0);
  }

  const results: string[] = [];
  const filesRead: string[] = [];
  for (const file of files) {
    if (results.length >= limits.maxSteps) {
      break;
    }
    const content = await readFileScoped(file, overlay, fsMode, limits.maxFileBytes);
    filesRead.push(file);
    const lines = content.split(/\r?\n/);
    lines.forEach((line, index) => {
      if (regex.test(line)) {
        results.push(`${toPosixPath(root, file)}:${index + 1}:${line}`);
      }
      regex.lastIndex = 0;
    });
    if (now() - start > limits.maxExecMs) {
      break;
    }
  }

  const redacted = applyRedactions(results.join('\n'), redactions);
  const output = clampOutput(redacted.value, limits.maxOutputBytes);
  const applied = [...redacted.applied];
  if (output.truncated) {
    applied.push('output_truncated');
  }
  return buildSuccessResult(output.value, filesRead, [], applied);
}

async function walkFiles(
  dir: string,
  files: string[],
  limits: { maxSteps: number; maxExecMs: number },
  now: () => number,
  start: number,
  steps: number
): Promise<number> {
  if (steps >= limits.maxSteps) {
    return steps;
  }
  if (now() - start > limits.maxExecMs) {
    return steps;
  }
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const sortedEntries = entries.sort((a, b) => a.name.localeCompare(b.name));
  for (const entry of sortedEntries) {
    if (steps >= limits.maxSteps) {
      return steps;
    }
    if (entry.name.startsWith('.')) {
      continue;
    }
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      steps = await walkFiles(fullPath, files, limits, now, start, steps + 1);
    } else if (entry.isFile()) {
      files.push(fullPath);
      steps += 1;
    }
  }
  return steps;
}

async function readFileScoped(
  resolved: string,
  overlay: Map<string, string>,
  fsMode: string,
  maxFileBytes: number
): Promise<string> {
  if ((fsMode === 'overlay' || fsMode === 'memory') && overlay.has(resolved)) {
    return overlay.get(resolved) ?? '';
  }
  const stat = await fs.stat(resolved);
  if (stat.size > maxFileBytes) {
    throw new Error('File exceeds max size');
  }
  return fs.readFile(resolved, 'utf8');
}

async function writeFileScoped(
  resolved: string,
  content: string,
  overlay: Map<string, string>,
  fsMode: string
): Promise<void> {
  if (fsMode === 'overlay' || fsMode === 'memory') {
    overlay.set(resolved, content);
    return;
  }
  await fs.mkdir(path.dirname(resolved), { recursive: true });
  await fs.writeFile(resolved, content, 'utf8');
}

function buildSuccessResult(
  stdout: string,
  filesRead: string[],
  filesWritten: string[],
  redactionsApplied: string[] = []
): ContextShellResult {
  return {
    stdout,
    stderr: '',
    exitCode: 0,
    filesRead: filesRead.map((file) => file),
    filesWritten: filesWritten.map((file) => file),
    durationMs: 0,
    redactionsApplied,
  };
}

function buildErrorResult(
  message: string,
  redactionsApplied: string[]
): ContextShellResult {
  return {
    stdout: '',
    stderr: message,
    exitCode: 1,
    filesRead: [],
    filesWritten: [],
    durationMs: 0,
    redactionsApplied,
  };
}

function buildPolicyDenied(decision: { reason?: string }): ContextShellResult {
  return buildErrorResult(`Policy denied: ${decision.reason ?? 'blocked'}`, []);
}

function buildCacheKey(
  tool: ContextShellToolName,
  call: ToolCall,
  policy: { id: string; version: string },
  repoSha: string
): string {
  const commandText =
    typeof call.metadata?.command === 'string' ? call.metadata.command : call.command;
  return hashValue(
    stableStringify({
      tool,
      command: commandText,
      args: call.args,
      path: call.path,
      policy: `${policy.id}@${policy.version}`,
      repoSha,
    })
  );
}

function createInMemoryCache() {
  const store = new Map<string, ContextShellResult>();
  return {
    get(key: string) {
      return store.get(key);
    },
    set(key: string, value: ContextShellResult) {
      store.set(key, value);
    },
  };
}

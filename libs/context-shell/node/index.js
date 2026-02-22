import { createHash } from 'crypto';
import * as fs from 'fs/promises';
import path from 'path';
import { AllowlistPolicy } from './policy.js';
import { applyRedactions } from './redaction.js';
import { createEvidenceWriter, hashPayload } from './evidence.js';
import { executeBashLike, parseCommands } from './interpreter.js';
const DEFAULT_LIMITS = {
    maxOutputBytes: 200_000,
    maxExecMs: 5_000,
    maxSteps: 20,
    maxFiles: 5_000,
};
function stableStringify(value) {
    if (Array.isArray(value)) {
        return `[${value.map((item) => stableStringify(item)).join(',')}]`;
    }
    if (value && typeof value === 'object') {
        const record = value;
        const keys = Object.keys(record).sort();
        const body = keys
            .map((key) => `"${key}":${stableStringify(record[key])}`)
            .join(',');
        return `{${body}}`;
    }
    return JSON.stringify(value);
}
function toHash(value) {
    return createHash('sha256').update(value).digest('hex');
}
function ensureWithinRoot(root, targetPath) {
    const resolvedRoot = path.resolve(root);
    const resolved = path.resolve(resolvedRoot, targetPath);
    if (!resolved.startsWith(resolvedRoot)) {
        throw new Error(`Path escapes root: ${targetPath}`);
    }
    return resolved;
}
function truncateOutput(value, maxBytes) {
    const buffer = Buffer.from(value, 'utf8');
    if (buffer.length <= maxBytes) {
        return value;
    }
    return buffer.subarray(0, maxBytes).toString('utf8');
}
async function listDirSafe(targetPath) {
    const entries = await fs.readdir(targetPath, { withFileTypes: true });
    return entries.map((entry) => entry.name).sort();
}
async function listFilesRecursive(rootPath, allowPath) {
    const results = [];
    const queue = [rootPath];
    while (queue.length > 0) {
        const current = queue.shift();
        if (!current) {
            continue;
        }
        const entries = await fs.readdir(current, { withFileTypes: true });
        for (const entry of entries) {
            const fullPath = path.join(current, entry.name);
            if (!allowPath(fullPath)) {
                continue;
            }
            if (entry.isDirectory()) {
                queue.push(fullPath);
            }
            else {
                results.push(fullPath);
            }
        }
    }
    return results.sort();
}
function mergeLimits(limits) {
    return { ...DEFAULT_LIMITS, ...limits };
}
function buildCacheKey(cache, normalized, policyVersion, root) {
    if (!cache) {
        return null;
    }
    const payload = stableStringify({ normalized, policyVersion, root });
    return toHash(payload);
}
async function withTimeout(promise, ms) {
    let timeoutId;
    const timeout = new Promise((_, reject) => {
        timeoutId = setTimeout(() => {
            reject(new Error('Execution timed out'));
        }, ms);
    });
    try {
        return await Promise.race([promise, timeout]);
    }
    finally {
        if (timeoutId) {
            clearTimeout(timeoutId);
        }
    }
}
async function applyHooksBefore(hooks, tool, input) {
    if (!hooks?.onBeforeCall) {
        return input;
    }
    const updated = await hooks.onBeforeCall({ tool, input });
    return updated?.input ?? input;
}
async function applyHooksAfter(hooks, tool, input, output) {
    if (!hooks?.onAfterCall) {
        return output;
    }
    const updated = await hooks.onAfterCall({ tool, input }, output);
    return updated ?? output;
}
async function recordEvidence(writer, event) {
    if (!writer) {
        return;
    }
    await writer.write(event);
}
function normalizePolicyDecision(decisions) {
    const combined = stableStringify(decisions.map((d) => d.decisionId));
    return {
        allow: decisions.every((d) => d.allow),
        decisionId: toHash(combined),
        reason: decisions.find((d) => !d.allow)?.reason,
    };
}
export function createContextShell(options) {
    const root = path.resolve(options.root);
    const fsMode = options.fsMode ?? 'readonly';
    const policy = options.policy ?? new AllowlistPolicy();
    const limits = mergeLimits(options.limits);
    const redactions = options.redactions ?? [];
    const cache = options.cache;
    const now = options.now ?? (() => Date.now());
    const evidence = options.evidence ?? createEvidenceWriter({ root });
    const allowReadPath = (candidate) => {
        const decision = policy.evaluate({
            operation: 'read',
            path: candidate,
        });
        return decision.allow;
    };
    const readFileInternal = async (target) => {
        const resolved = ensureWithinRoot(root, target);
        const decision = policy.evaluate({
            operation: 'read',
            path: resolved,
        });
        if (!decision.allow) {
            throw new Error(decision.reason ?? 'Read denied');
        }
        return fs.readFile(resolved, 'utf8');
    };
    const listDirInternal = async (target) => {
        const resolved = ensureWithinRoot(root, target);
        const decision = policy.evaluate({
            operation: 'read',
            path: resolved,
        });
        if (!decision.allow) {
            throw new Error(decision.reason ?? 'Read denied');
        }
        const entries = await listDirSafe(resolved);
        return entries.filter((entry) => allowReadPath(path.join(resolved, entry)));
    };
    const listFilesInternal = async (target) => {
        const resolved = ensureWithinRoot(root, target);
        const decision = policy.evaluate({
            operation: 'read',
            path: resolved,
        });
        if (!decision.allow) {
            throw new Error(decision.reason ?? 'Read denied');
        }
        return listFilesRecursive(resolved, allowReadPath);
    };
    const bash = async (command) => {
        const start = now();
        const sanitizedInput = await applyHooksBefore(options.hooks, 'bash', {
            command,
        });
        const normalizedCommand = policy.normalizeCommand(String(sanitizedInput.command ?? command), []);
        const parsedCommands = parseCommands(normalizedCommand);
        const commandDecisions = parsedCommands.map((parsed) => policy.evaluate({
            operation: 'command',
            command: parsed.name,
            args: parsed.args,
        }));
        const decision = normalizePolicyDecision(commandDecisions);
        const startEvent = {
            type: 'tool_call_start',
            ts: new Date(start).toISOString(),
            tool: 'bash',
            normalized: normalizedCommand,
            policyDecisionId: decision.decisionId,
            inputsHash: hashPayload(stableStringify({ command: normalizedCommand, root })),
        };
        await recordEvidence(evidence, startEvent);
        if (parsedCommands.length > limits.maxSteps) {
            const end = now();
            const output = {
                stdout: '',
                stderr: 'Command pipeline exceeds max steps\\n',
                exitCode: 1,
                filesRead: [],
                filesWritten: [],
                durationMs: end - start,
                redactionsApplied: [],
            };
            await recordEvidence(evidence, {
                type: 'tool_call_end',
                ts: new Date(end).toISOString(),
                tool: 'bash',
                normalized: normalizedCommand,
                policyDecisionId: decision.decisionId,
                outputsHash: hashPayload(stableStringify(output)),
                durationMs: end - start,
                exitCode: output.exitCode,
            });
            return output;
        }
        if (!decision.allow) {
            const end = now();
            const output = {
                stdout: '',
                stderr: decision.reason ? `${decision.reason}\n` : 'Policy denied\n',
                exitCode: 1,
                filesRead: [],
                filesWritten: [],
                durationMs: end - start,
                redactionsApplied: [],
            };
            await recordEvidence(evidence, {
                type: 'tool_call_end',
                ts: new Date(end).toISOString(),
                tool: 'bash',
                normalized: normalizedCommand,
                policyDecisionId: decision.decisionId,
                outputsHash: hashPayload(stableStringify(output)),
                durationMs: end - start,
                exitCode: output.exitCode,
                filesRead: [],
                filesWritten: [],
                redactionsApplied: [],
            });
            return output;
        }
        const cacheKey = buildCacheKey(cache, normalizedCommand, policy.version, root);
        if (cacheKey) {
            const cached = cache?.get(cacheKey);
            if (cached) {
                const end = now();
                await recordEvidence(evidence, {
                    type: 'tool_call_end',
                    ts: new Date(end).toISOString(),
                    tool: 'bash',
                    normalized: normalizedCommand,
                    policyDecisionId: decision.decisionId,
                    outputsHash: hashPayload(stableStringify(cached)),
                    durationMs: end - start,
                    exitCode: cached.exitCode,
                    filesRead: cached.filesRead,
                    filesWritten: cached.filesWritten,
                    redactionsApplied: cached.redactionsApplied,
                });
                return cached;
            }
        }
        const interpreterCtx = {
            root,
            limits,
            policy,
            redactions,
            now,
            readFile: readFileInternal,
            listDir: listDirInternal,
            listFilesRecursive: listFilesInternal,
        };
        let result;
        try {
            result = await withTimeout(executeBashLike(interpreterCtx, normalizedCommand), limits.maxExecMs);
        }
        catch (error) {
            const end = now();
            const output = {
                stdout: '',
                stderr: `${error.message}\\n`,
                exitCode: 1,
                filesRead: [],
                filesWritten: [],
                durationMs: end - start,
                redactionsApplied: [],
            };
            await recordEvidence(evidence, {
                type: 'tool_call_end',
                ts: new Date(end).toISOString(),
                tool: 'bash',
                normalized: normalizedCommand,
                policyDecisionId: decision.decisionId,
                outputsHash: hashPayload(stableStringify(output)),
                durationMs: end - start,
                exitCode: output.exitCode,
            });
            return output;
        }
        const redactedOut = applyRedactions(result.stdout, redactions);
        const redactedErr = applyRedactions(result.stderr, redactions);
        const stdout = truncateOutput(redactedOut.value, limits.maxOutputBytes);
        const stderr = truncateOutput(redactedErr.value, limits.maxOutputBytes);
        const end = now();
        const output = {
            stdout,
            stderr,
            exitCode: result.exitCode,
            filesRead: result.filesRead,
            filesWritten: [],
            durationMs: end - start,
            redactionsApplied: [...redactedOut.applied, ...redactedErr.applied],
        };
        await recordEvidence(evidence, {
            type: 'tool_call_end',
            ts: new Date(end).toISOString(),
            tool: 'bash',
            normalized: normalizedCommand,
            policyDecisionId: decision.decisionId,
            outputsHash: hashPayload(stableStringify(output)),
            durationMs: end - start,
            exitCode: output.exitCode,
            filesRead: output.filesRead,
            filesWritten: output.filesWritten,
            redactionsApplied: output.redactionsApplied,
        });
        const finalOutput = await applyHooksAfter(options.hooks, 'bash', sanitizedInput, output);
        if (cacheKey) {
            cache?.set(cacheKey, finalOutput);
        }
        return finalOutput;
    };
    const readFile = async (targetPath) => {
        const start = now();
        const sanitizedInput = await applyHooksBefore(options.hooks, 'readFile', {
            path: targetPath,
        });
        const resolved = ensureWithinRoot(root, String(sanitizedInput.path ?? targetPath));
        const decision = policy.evaluate({
            operation: 'read',
            path: resolved,
        });
        await recordEvidence(evidence, {
            type: 'tool_call_start',
            ts: new Date(start).toISOString(),
            tool: 'readFile',
            normalized: resolved,
            policyDecisionId: decision.decisionId,
            inputsHash: hashPayload(stableStringify({ path: resolved })),
        });
        if (!decision.allow) {
            const end = now();
            const output = {
                stdout: '',
                stderr: decision.reason ? `${decision.reason}\n` : 'Policy denied\n',
                exitCode: 1,
                filesRead: [],
                filesWritten: [],
                durationMs: end - start,
                redactionsApplied: [],
            };
            await recordEvidence(evidence, {
                type: 'tool_call_end',
                ts: new Date(end).toISOString(),
                tool: 'readFile',
                normalized: resolved,
                policyDecisionId: decision.decisionId,
                outputsHash: hashPayload(stableStringify(output)),
                durationMs: end - start,
                exitCode: output.exitCode,
            });
            return output;
        }
        try {
            const content = await readFileInternal(resolved);
            const redacted = applyRedactions(content, redactions);
            const stdout = truncateOutput(redacted.value, limits.maxOutputBytes);
            const end = now();
            const output = {
                stdout,
                stderr: '',
                exitCode: 0,
                filesRead: [resolved],
                filesWritten: [],
                durationMs: end - start,
                redactionsApplied: redacted.applied,
            };
            await recordEvidence(evidence, {
                type: 'tool_call_end',
                ts: new Date(end).toISOString(),
                tool: 'readFile',
                normalized: resolved,
                policyDecisionId: decision.decisionId,
                outputsHash: hashPayload(stableStringify(output)),
                durationMs: end - start,
                exitCode: output.exitCode,
                filesRead: output.filesRead,
                filesWritten: output.filesWritten,
                redactionsApplied: output.redactionsApplied,
            });
            return applyHooksAfter(options.hooks, 'readFile', sanitizedInput, output);
        }
        catch (error) {
            const end = now();
            const output = {
                stdout: '',
                stderr: `${error.message}\n`,
                exitCode: 1,
                filesRead: [],
                filesWritten: [],
                durationMs: end - start,
                redactionsApplied: [],
            };
            await recordEvidence(evidence, {
                type: 'tool_call_end',
                ts: new Date(end).toISOString(),
                tool: 'readFile',
                normalized: resolved,
                policyDecisionId: decision.decisionId,
                outputsHash: hashPayload(stableStringify(output)),
                durationMs: end - start,
                exitCode: output.exitCode,
            });
            return output;
        }
    };
    const writeFile = async (targetPath, content, optionsOverride) => {
        const start = now();
        const sanitizedInput = await applyHooksBefore(options.hooks, 'writeFile', {
            path: targetPath,
            content,
            options: optionsOverride,
        });
        const resolved = ensureWithinRoot(root, String(sanitizedInput.path ?? targetPath));
        const writeOptions = (sanitizedInput.options ?? optionsOverride);
        const justification = writeOptions?.justification;
        const format = writeOptions?.format ?? 'patch';
        const decision = policy.evaluate({
            operation: 'write',
            path: resolved,
            justification,
        });
        await recordEvidence(evidence, {
            type: 'tool_call_start',
            ts: new Date(start).toISOString(),
            tool: 'writeFile',
            normalized: resolved,
            policyDecisionId: decision.decisionId,
            inputsHash: hashPayload(stableStringify({ path: resolved, format })),
        });
        if (!decision.allow) {
            const end = now();
            const output = {
                stdout: '',
                stderr: decision.reason ? `${decision.reason}\n` : 'Policy denied\n',
                exitCode: 1,
                filesRead: [],
                filesWritten: [],
                durationMs: end - start,
                redactionsApplied: [],
            };
            await recordEvidence(evidence, {
                type: 'tool_call_end',
                ts: new Date(end).toISOString(),
                tool: 'writeFile',
                normalized: resolved,
                policyDecisionId: decision.decisionId,
                outputsHash: hashPayload(stableStringify(output)),
                durationMs: end - start,
                exitCode: output.exitCode,
            });
            return output;
        }
        if (fsMode === 'readonly') {
            const end = now();
            const output = {
                stdout: '',
                stderr: 'Filesystem is read-only\n',
                exitCode: 1,
                filesRead: [],
                filesWritten: [],
                durationMs: end - start,
                redactionsApplied: [],
            };
            await recordEvidence(evidence, {
                type: 'tool_call_end',
                ts: new Date(end).toISOString(),
                tool: 'writeFile',
                normalized: resolved,
                policyDecisionId: decision.decisionId,
                outputsHash: hashPayload(stableStringify(output)),
                durationMs: end - start,
                exitCode: output.exitCode,
            });
            return output;
        }
        if (format !== 'patch') {
            const end = now();
            const output = {
                stdout: '',
                stderr: 'writeFile requires patch format\n',
                exitCode: 1,
                filesRead: [],
                filesWritten: [],
                durationMs: end - start,
                redactionsApplied: [],
            };
            await recordEvidence(evidence, {
                type: 'tool_call_end',
                ts: new Date(end).toISOString(),
                tool: 'writeFile',
                normalized: resolved,
                policyDecisionId: decision.decisionId,
                outputsHash: hashPayload(stableStringify(output)),
                durationMs: end - start,
                exitCode: output.exitCode,
            });
            return output;
        }
        try {
            await applyPatch(root, String(sanitizedInput.content ?? content));
        }
        catch (error) {
            const end = now();
            const output = {
                stdout: '',
                stderr: `${error.message}\n`,
                exitCode: 1,
                filesRead: [],
                filesWritten: [],
                durationMs: end - start,
                redactionsApplied: [],
            };
            await recordEvidence(evidence, {
                type: 'tool_call_end',
                ts: new Date(end).toISOString(),
                tool: 'writeFile',
                normalized: resolved,
                policyDecisionId: decision.decisionId,
                outputsHash: hashPayload(stableStringify(output)),
                durationMs: end - start,
                exitCode: output.exitCode,
            });
            return output;
        }
        const end = now();
        const output = {
            stdout: 'ok\n',
            stderr: '',
            exitCode: 0,
            filesRead: [],
            filesWritten: [resolved],
            durationMs: end - start,
            redactionsApplied: [],
        };
        await recordEvidence(evidence, {
            type: 'tool_call_end',
            ts: new Date(end).toISOString(),
            tool: 'writeFile',
            normalized: resolved,
            policyDecisionId: decision.decisionId,
            outputsHash: hashPayload(stableStringify(output)),
            durationMs: end - start,
            exitCode: output.exitCode,
            filesWritten: output.filesWritten,
        });
        return applyHooksAfter(options.hooks, 'writeFile', sanitizedInput, output);
    };
    return { bash, readFile, writeFile };
}
async function applyPatch(root, patch) {
    const lines = patch.split(/\r?\n/);
    if (!lines[0]?.startsWith('*** Begin Patch')) {
        throw new Error('Patch must start with *** Begin Patch');
    }
    let index = 0;
    while (index < lines.length) {
        const line = lines[index];
        if (line.startsWith('*** Begin Patch')) {
            index += 1;
            continue;
        }
        if (line.startsWith('*** End Patch')) {
            break;
        }
        if (line.startsWith('*** Update File:')) {
            const filePath = line.replace('*** Update File:', '').trim();
            const absolutePath = ensureWithinRoot(root, path.resolve(root, filePath));
            const original = await fs.readFile(absolutePath, 'utf8');
            const originalLines = original.split(/\r?\n/);
            const updatedLines = [];
            let originalIndex = 0;
            index += 1;
            while (index < lines.length) {
                const patchLine = lines[index];
                if (patchLine.startsWith('***') || patchLine.startsWith('@@')) {
                    if (patchLine.startsWith('*** End Patch')) {
                        break;
                    }
                    if (patchLine.startsWith('*** Update File:')) {
                        break;
                    }
                    index += 1;
                    continue;
                }
                const symbol = patchLine[0];
                const content = patchLine.slice(1);
                if (symbol === ' ') {
                    if (originalLines[originalIndex] !== content) {
                        throw new Error('Patch context mismatch');
                    }
                    updatedLines.push(content);
                    originalIndex += 1;
                }
                else if (symbol === '-') {
                    if (originalLines[originalIndex] !== content) {
                        throw new Error('Patch deletion mismatch');
                    }
                    originalIndex += 1;
                }
                else if (symbol === '+') {
                    updatedLines.push(content);
                }
                index += 1;
            }
            updatedLines.push(...originalLines.slice(originalIndex));
            await fs.writeFile(absolutePath, updatedLines.join('\n'), 'utf8');
            continue;
        }
        if (line.startsWith('*** Add File:')) {
            const filePath = line.replace('*** Add File:', '').trim();
            const absolutePath = ensureWithinRoot(root, path.resolve(root, filePath));
            const contentLines = [];
            index += 1;
            while (index < lines.length) {
                const patchLine = lines[index];
                if (patchLine.startsWith('*** End Patch')) {
                    break;
                }
                if (patchLine.startsWith('***')) {
                    break;
                }
                if (patchLine.startsWith('+')) {
                    contentLines.push(patchLine.slice(1));
                }
                index += 1;
            }
            await fs.mkdir(path.dirname(absolutePath), { recursive: true });
            await fs.writeFile(absolutePath, contentLines.join('\n'), 'utf8');
            continue;
        }
        index += 1;
    }
}
export { AllowlistPolicy } from './policy.js';
export { createEvidenceWriter } from './evidence.js';
export * from './types.js';
//# sourceMappingURL=index.js.map
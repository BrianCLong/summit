import path from 'path';
import process from 'process';
import {
  AgentTrajectory,
  DEFAULT_SCHEMA_VERSION,
  GENERATOR_VERSION,
} from '@intelgraph/agentic-trajectories';
import { validateTrajectory } from '@intelgraph/agentic-trajectories';
import { AgenticTask, loadTasks } from './task.js';
import {
  ChatMessage,
  LLMClient,
  LLMRouterClient,
  MockLLMClient,
} from './llmAdapter.js';
import { BenchReport, writeReport } from './report.js';

export interface RunOptions {
  tasksDir: string;
  taskType?: AgenticTask['type'];
  useMockClient?: boolean;
  artifactDir?: string;
}

interface ParsedAssistantOutput {
  plan: string;
  reflection: string;
  tool_calls: Array<{ name: string; arguments: Record<string, unknown>; call_id: string }>;
  final_answer: string;
}

function buildPrompt(task: AgenticTask): ChatMessage[] {
  const system =
    'You must respond with JSON containing plan, tool_calls (array of name, arguments, call_id), final_answer, reflection.';
  const user = (() => {
    if (task.type === 'deep-research') {
      return `Research question: ${task.question}. Provide at least ${task.requiredCitations} citations.`;
    }
    if (task.type === 'code') {
      return `Repository ${task.repoPath}. Issue: ${task.issue}. Return a patch summary and tests you would run.`;
    }
    return `Request: ${task.request}. Tools available: ${task.toolSpec}. Expected tool shape: ${task.expectedToolShape.join(', ')}`;
  })();
  return [
    { role: 'system', content: system },
    { role: 'user', content: user },
  ];
}

function extractJson(text: string): unknown {
  const fence = /```json\n([\s\S]*?)```/m.exec(text);
  if (fence && fence[1]) {
    return JSON.parse(fence[1]);
  }
  return JSON.parse(text);
}

function ensureTooling(parsed: unknown): ParsedAssistantOutput {
  const payload = parsed as {
    plan?: unknown;
    reflection?: unknown;
    final_answer?: unknown;
    tool_calls?: unknown;
  };
  const safePlan = typeof payload?.plan === 'string' ? payload.plan : '';
  const safeReflection =
    typeof payload?.reflection === 'string' ? payload.reflection : '';
  const safeAnswer =
    typeof payload?.final_answer === 'string'
      ? payload.final_answer
      : JSON.stringify(payload ?? {});
  const rawCalls = Array.isArray(payload?.tool_calls) ? payload.tool_calls : [];
  const tool_calls = rawCalls.map((call, idx) => {
    const entry = call as {
      name?: unknown;
      arguments?: unknown;
      call_id?: unknown;
    };
    return {
      name: typeof entry?.name === 'string' ? entry.name : 'unknown',
      arguments:
        typeof entry?.arguments === 'object' && entry.arguments !== null
          ? (entry.arguments as Record<string, unknown>)
          : {},
      call_id:
        typeof entry?.call_id === 'string' ? entry.call_id : `auto-${idx}`,
    };
  });
  return { plan: safePlan, reflection: safeReflection, tool_calls, final_answer: safeAnswer };
}

function buildTrajectory(task: AgenticTask, parsed: ParsedAssistantOutput): AgentTrajectory {
  const timestamp = new Date().toISOString();
  const toolResults = parsed.tool_calls.map((call) => ({
    call_id: call.call_id || 'auto',
    ok: true,
    stdout: 'mocked',
    ts: timestamp,
  }));

  return {
    id: `${task.id}-${Date.now()}`,
    meta: {
      schema_version: DEFAULT_SCHEMA_VERSION,
      generator_version: GENERATOR_VERSION,
      task_type: task.type,
      allowed_tools: parsed.tool_calls.map((c) => c.name),
    },
    turns: [
      { role: 'user', content: task.description },
      {
        role: 'assistant',
        plan: parsed.plan,
        reflection: parsed.reflection,
        content: parsed.final_answer,
        toolCalls: parsed.tool_calls.map((call) => ({
          ...call,
          ts: timestamp,
        })),
        toolResults,
      },
    ],
  };
}

function evaluateTask(
  task: AgenticTask,
  trajectory: AgentTrajectory,
): { pass: boolean; notes: string[] } {
  const notes: string[] = [];
  let pass = true;

  const assistantTurn = trajectory.turns.find((t) => t.role === 'assistant');
  const finalAnswer = assistantTurn?.content || '';
  const toolCalls = assistantTurn?.toolCalls || [];
  if (!assistantTurn?.reflection) {
    pass = false;
    notes.push('Missing reflection');
  }

  if (task.type === 'deep-research') {
    const citationCount = (finalAnswer.match(/\[/g) || []).length;
    if (citationCount < task.requiredCitations) {
      pass = false;
      notes.push('Insufficient citations');
    }
  }

  if (task.type === 'code') {
    if (!finalAnswer.toLowerCase().includes(task.expectedSummary.toLowerCase())) {
      pass = false;
      notes.push('Patch summary not echoed');
    }
  }

  if (task.type === 'tool') {
    if (toolCalls.length < task.expectedToolShape.length) {
      pass = false;
      notes.push('Tool sequence shorter than expected');
    }
  }

  return { pass, notes };
}

export async function runBench(options: RunOptions): Promise<BenchReport> {
  const tasks = loadTasks(options.tasksDir, options.taskType);
  const client: LLMClient = options.useMockClient
    ? new MockLLMClient()
    : new LLMRouterClient(false);
  const results: BenchReport['results'] = [];

  for (const task of tasks) {
    const messages = buildPrompt(task);
    let responseText = '';
    try {
      responseText = await client.complete(messages, task.type);
    } catch (err) {
      const error = err as Error;
      results.push({
        task,
        pass: false,
        validation: { valid: false, errors: [error.message] },
        notes: ['LLM error'],
        trajectory: undefined,
      });
      continue;
    }

    let parsed: ParsedAssistantOutput;
    try {
      parsed = ensureTooling(extractJson(responseText));
    } catch (err) {
      const error = err as Error;
      results.push({
        task,
        pass: false,
        validation: { valid: false, errors: [error.message] },
        notes: ['Invalid JSON output'],
        trajectory: undefined,
      });
      continue;
    }

    const trajectory = buildTrajectory(task, parsed);
    const validation = validateTrajectory(trajectory);
    const evaluation = evaluateTask(task, trajectory);
    results.push({
      task,
      pass: validation.valid && evaluation.pass,
      validation,
      notes: evaluation.notes,
      trajectory,
    });
  }

  const report: BenchReport = {
    generatedAt: new Date().toISOString(),
    results,
    metrics: {
      total: results.length,
      passed: results.filter((r) => r.pass).length,
      reflectionRate:
        results.filter((r) => r.trajectory?.turns[1]?.reflection).length /
        Math.max(results.length, 1),
      averageToolCalls:
        results.reduce(
          (sum, r) => sum + (r.trajectory?.turns[1]?.toolCalls?.length || 0),
          0,
        ) / Math.max(results.length, 1),
    },
  };

  const artifactDir =
    options.artifactDir ||
    path.join(process.cwd(), 'artifacts', 'agentic-bench');
  writeReport(report, artifactDir);
  return report;
}

export function runFromCli(args: string[]) {
  const typeArg = args.find((value) => value.startsWith('--type='));
  const useRouter = args.includes('--router');
  const type = typeArg ? (typeArg.split('=')[1] as AgenticTask['type']) : undefined;
  const tasksDir = path.join(
    path.resolve(process.cwd()),
    'packages',
    'agentic-bench',
    'src',
    'benchmarks',
  );
  runBench({ tasksDir, taskType: type, useMockClient: !useRouter })
    .then((report) => {
      // eslint-disable-next-line no-console
      console.log(`Generated report for ${report.results.length} tasks`);
    })
    .catch((err) => {
      // eslint-disable-next-line no-console
      console.error('Bench run failed', err);
      process.exitCode = 1;
    });
}

import type { ToolRegistry } from '../tools/tool-registry.js';
import type { ToolExecutionContext, ToolExecutionResult } from '../types.js';

export type ReactAction = {
  toolId: string;
  input: Record<string, unknown>;
};

export type ReactRequest = {
  plan?: string[];
  actions: ReactAction[];
};

export type ReactObservation = {
  action: ReactAction;
  result: ToolExecutionResult<unknown>;
  suggestions?: string[];
};

export type ReactResponse = {
  plan?: string[];
  observations: ReactObservation[];
};

const suggestForEmpty = (result: unknown): string[] | undefined => {
  if (!result || typeof result !== 'object') {
    return undefined;
  }
  const rows = (result as { rows?: unknown[] }).rows;
  if (Array.isArray(rows) && rows.length === 0) {
    return [
      'Try a broader query or different field filters.',
      'Verify scope permissions for this dataset.',
    ];
  }
  return undefined;
};

export const executeReact = async (
  registry: ToolRegistry,
  context: ToolExecutionContext,
  request: ReactRequest,
  maxToolCalls: number,
  executeTool: (
    toolId: string,
    input: Record<string, unknown>,
    context: ToolExecutionContext,
  ) => Promise<ToolExecutionResult<unknown>>,
): Promise<ReactResponse> => {
  const actions = request.actions.slice(0, maxToolCalls);
  const observations: ReactObservation[] = [];

  for (const action of actions) {
    registry.getTool(action.toolId);
    const result = await executeTool(action.toolId, action.input, context);
    observations.push({
      action,
      result,
      suggestions: result.ok ? suggestForEmpty(result.data) : undefined,
    });
  }

  return {
    plan: request.plan,
    observations,
  };
};

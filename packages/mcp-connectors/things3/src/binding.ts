import { MCPTool, TaskOperation } from './types.js';
import { selectTool } from './utils.js';

export interface ToolBinding {
  search: MCPTool;
  create: MCPTool;
  update: MCPTool;
}

const keywordMap: Record<TaskOperation, string[]> = {
  search: ['search', 'find', 'query', 'todo', 'task', 'project'],
  create: ['create', 'add', 'new', 'todo', 'task'],
  update: ['update', 'modify', 'complete', 'todo', 'task'],
};

const resolveByOverride = (
  tools: MCPTool[],
  name: string | undefined,
): MCPTool | undefined => {
  if (!name) {
    return undefined;
  }
  return tools.find((tool) => tool.name === name);
};

export const resolveTools = (
  tools: MCPTool[],
  overrides?: Partial<Record<TaskOperation, string>>,
): ToolBinding => {
  const search = resolveByOverride(tools, overrides?.search) ??
    selectTool(tools, keywordMap.search);
  const create = resolveByOverride(tools, overrides?.create) ??
    selectTool(tools, keywordMap.create);
  const update = resolveByOverride(tools, overrides?.update) ??
    selectTool(tools, keywordMap.update);

  const missing = [
    !search ? 'search' : null,
    !create ? 'create' : null,
    !update ? 'update' : null,
  ].filter(Boolean);

  if (missing.length > 0 || !search || !create || !update) {
    throw new Error(
      `Missing MCP tools for operations: ${missing.join(', ')}. ` +
        'Ensure the MCP server exposes Things 3 tools or configure toolOverrides.',
    );
  }

  return { search, create, update };
};

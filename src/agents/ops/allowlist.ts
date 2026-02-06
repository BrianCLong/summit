export const ALLOWED_EVENT_TYPES = new Set<string>([
  'AgentStart',
  'AgentStop',
  'TaskCreate',
  'TaskUpdate',
  'TaskComplete',
  'TaskError',
  'ToolUse',
  'ToolResult',
]);

export const TOOL_TYPES = ['EVIDENCE', 'VERIFICATION', 'HYBRID', 'HUMAN'] as const;

export type ToolType = (typeof TOOL_TYPES)[number];

export const isToolType = (value: string): value is ToolType =>
  TOOL_TYPES.includes(value as ToolType);

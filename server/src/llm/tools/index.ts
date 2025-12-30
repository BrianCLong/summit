
import { ToolRegistry } from './registry.js';
import { retrievalTool } from './retrieval-tool.js';

export * from './registry.js';
export * from './retrieval-tool.js';

export const defaultToolRegistry = new ToolRegistry();
defaultToolRegistry.register(retrievalTool);

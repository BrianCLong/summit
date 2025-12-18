
import { ToolRegistry } from './registry';
import { retrievalTool } from './retrieval-tool';

export * from './registry';
export * from './retrieval-tool';

export const defaultToolRegistry = new ToolRegistry();
defaultToolRegistry.register(retrievalTool);

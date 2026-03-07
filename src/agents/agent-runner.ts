import { ToolRegistry } from './tool-search/tool-registry';
import { ToolIndex } from './tool-search/tool-index';
import { ToolFetcher } from './tool-search/tool-fetcher';

export class AgentRunner {
  private registry = new ToolRegistry();
  private index = new ToolIndex(this.registry);
  private fetcher = new ToolFetcher(this.registry);

  async executeWithToolSearch(prompt: string) {
    // 1. Get tool index
    const tools = this.index.getAvailableTools();

    // 2. Simulate model choosing a tool
    const selectedToolId = tools.length > 0 ? tools[0].id : null;

    if (selectedToolId) {
      // 3. Fetch full definition lazily
      const definition = this.fetcher.getToolDefinition(selectedToolId);
      return { status: 'success', toolExecuted: definition.id };
    }

    return { status: 'success', toolExecuted: null };
  }
}

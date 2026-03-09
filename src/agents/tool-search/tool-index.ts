import { ToolRegistry } from './tool-registry';

export class ToolIndex {
  constructor(private registry: ToolRegistry) {}

  getAvailableTools() {
    return this.registry.getIndex();
  }
}

export class ToolPolicy {
  private whitelist: Set<string> = new Set();

  allowTool(id: string) {
    this.whitelist.add(id);
  }

  isAllowed(id: string) {
    return this.whitelist.has(id);
  }
}

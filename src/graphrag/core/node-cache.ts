export class NodeCache {
  private cache = new Map<string, any>();
  get(nodeId: string) {
    return this.cache.get(nodeId);
  }
  set(nodeId: string, data: any) {
    this.cache.set(nodeId, data);
  }
}

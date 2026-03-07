export class ContextManager {
  private context: object = {};
  setContext(key: string, value: any) {
    this.context[key] = value;
  }
}

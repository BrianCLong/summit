import { GenerativeInterface } from '../schema/interface.schema';

export class InterfaceContext {
  private interfaces: Map<string, GenerativeInterface> = new Map();

  save(sessionId: string, ui: GenerativeInterface) {
    this.interfaces.set(sessionId, ui);
  }

  get(sessionId: string): GenerativeInterface | undefined {
    return this.interfaces.get(sessionId);
  }
}

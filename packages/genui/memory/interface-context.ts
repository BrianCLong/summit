import { GenerativeInterface } from '../schema/interface.schema';

export class InterfaceContext {
  private state: Map<string, GenerativeInterface> = new Map();

  save(sessionId: string, interfaceData: GenerativeInterface): void {
    this.state.set(sessionId, interfaceData);
  }

  load(sessionId: string): GenerativeInterface | undefined {
    return this.state.get(sessionId);
  }
}

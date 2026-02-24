import { Capability } from './types.js';

export interface Registry {
  getCapability(id: string): Capability | undefined;
  listCapabilities(): Capability[];
  registerCapability(capability: Capability): void;
}

export class InMemoryRegistry implements Registry {
  private capabilities = new Map<string, Capability>();

  getCapability(id: string): Capability | undefined {
    return this.capabilities.get(id);
  }

  listCapabilities(): Capability[] {
    return Array.from(this.capabilities.values());
  }

  registerCapability(capability: Capability): void {
    this.capabilities.set(capability.id, capability);
  }
}

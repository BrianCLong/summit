import { CapabilityModel } from './types.js';

export interface Registry {
  findCapability(capability: string): Promise<CapabilityModel | null>;
}

export class InMemoryRegistry implements Registry {
  private capabilities: Map<string, CapabilityModel> = new Map();

  constructor() {}

  async findCapability(capability: string): Promise<CapabilityModel | null> {
    return this.capabilities.get(capability) || null;
  }

  // Helper for tests/stubs
  register(capability: string, version: string, serverId: string) {
    this.capabilities.set(capability, { capability, version, serverId });
  }
}

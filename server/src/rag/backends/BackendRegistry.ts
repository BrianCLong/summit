import { BackendCapabilities, BackendId, getBackendCapabilityMap } from './capabilities.js';

export class BackendRegistry {
  private readonly capabilities = getBackendCapabilityMap();

  list(): BackendCapabilities[] {
    return Object.values(this.capabilities);
  }

  get(id: BackendId): BackendCapabilities | undefined {
    return this.capabilities[id];
  }

  require(id: BackendId): BackendCapabilities {
    const capability = this.capabilities[id];
    if (!capability) {
      throw new Error(`Unknown backend capability: ${id}`);
    }
    return capability;
  }
}

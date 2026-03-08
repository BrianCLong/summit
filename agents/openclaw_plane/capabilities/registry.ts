export interface CapabilityManifest {
  id: string;
  description: string;
  filesystemScope?: string;
  networkDestinations?: string[];
  maxRuntimeMs?: number;
  maxTokens?: number;
  evidenceFieldsEmitted?: string[];
  denylistedOperations?: string[];
}

export class Registry {
  private capabilities: Map<string, CapabilityManifest> = new Map();

  register(manifest: CapabilityManifest): void {
    this.capabilities.set(manifest.id, manifest);
  }

  get(id: string): CapabilityManifest | undefined {
    return this.capabilities.get(id);
  }
}

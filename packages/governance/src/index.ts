export type ATFLevel = 'intern' | 'junior' | 'senior' | 'principal';

export interface IdentityManifest {
  name: string;
  version: string;
  capabilities: string[];
  description?: string;
  author?: string;
}

export function createAgentId(manifest: IdentityManifest): string {
  return `agent-${manifest.name}-${manifest.version}`.toLowerCase().replace(/[^a-z0-9-]/g, '-');
}

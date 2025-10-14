import { AllowlistManifest } from './types.js';

export interface ToolInvocationRequest {
  tool: string;
  version: string;
  environment: string;
}

export class AllowlistViolation extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AllowlistViolation';
  }
}

export function createTesqPolicyHook(manifest: AllowlistManifest) {
  const index = new Map<string, number>();
  for (const entry of manifest.entries) {
    index.set(`${entry.tool.toLowerCase()}@${entry.version}`, entry.riskScore);
  }
  return function enforce(request: ToolInvocationRequest) {
    if (request.environment !== manifest.environment) {
      throw new AllowlistViolation(
        `Manifest environment mismatch: expected ${manifest.environment}, received ${request.environment}`
      );
    }
    const key = `${request.tool.toLowerCase()}@${request.version}`;
    if (!index.has(key)) {
      throw new AllowlistViolation(
        `Tool ${request.tool}@${request.version} is not present in the allowlist`
      );
    }
    return {
      tool: request.tool,
      version: request.version,
      riskScore: index.get(key) ?? 0
    };
  };
}


import { z } from 'zod';

export enum CapabilityType {
  READ = 'read',
  ANALYZE = 'analyze',
  RECOMMEND = 'recommend',
  SIMULATE = 'simulate',
  COORDINATE = 'coordinate',
  PLAN = 'plan',
  ACT = 'act',
}

export const CapabilityLimitsSchema = z.object({
  maxSteps: z.number().int().optional(),
  maxDepth: z.number().int().optional(),
  timeoutMs: z.number().int().optional(),
  memoryLimitBytes: z.number().int().optional(),
  allowedTools: z.array(z.string()).optional(),
  prohibitedActions: z.array(z.string()).optional(),
});

export interface CapabilityLimits {
  maxSteps?: number;
  maxDepth?: number;
  timeoutMs?: number;
  memoryLimitBytes?: number;
  allowedTools?: string[];
  prohibitedActions?: string[];
}

export interface CapabilitySchema {
  id: string;
  name: string;
  version: string;
  type: CapabilityType;
  description: string;
  scope: string; // e.g., "read:*" or "write:logs"
  limits: CapabilityLimits;
  prohibitedActions: string[];
}

export interface CapabilityImplementation {
  schema: CapabilitySchema;
  execute(input: any, context: any): Promise<any>;
}

export class CapabilityRegistry {
  private capabilities: Map<string, CapabilityImplementation> = new Map();

  register(impl: CapabilityImplementation): void {
    if (this.capabilities.has(impl.schema.id)) {
      throw new Error(`Capability ${impl.schema.id} already registered`);
    }
    this.capabilities.set(impl.schema.id, impl);
  }

  get(id: string): CapabilityImplementation | undefined {
    return this.capabilities.get(id);
  }

  list(): CapabilitySchema[] {
    return Array.from(this.capabilities.values()).map((c) => c.schema);
  }
}

export const capabilityRegistry = new CapabilityRegistry();

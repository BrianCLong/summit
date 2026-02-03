import { MemoryRecord } from '../types';

export interface PortableBundle {
  version: string;
  userId: string;
  contextSpace: string;
  memories: MemoryRecord[];
  exportedAt: number;
  signature: string;
}

export function pack(userId: string, contextSpace: string, memories: MemoryRecord[]): PortableBundle {
  if (process.env.MEMORY_PORTABILITY_ENABLED !== 'true') {
    throw new Error("Memory portability is currently disabled.");
  }

  const bundle: PortableBundle = {
    version: "1.0",
    userId,
    contextSpace,
    memories,
    exportedAt: Date.now(),
    signature: "simulated-hmac-signature"
  };

  return bundle;
}

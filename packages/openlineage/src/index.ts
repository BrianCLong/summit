export * from './runid.js';
export * from './event.js';

export class OpenLineageEmitter {
  constructor(private endpoint: string, private namespace: string) {}

  async emit(event: any) {
    // Skeleton implementation for event emission
    console.log(`[OpenLineage] Emitting ${event.eventType} to ${this.endpoint}`);
    // In a real implementation, this would use fetch/axios to POST to the endpoint
    return { status: 202 };
  }
}

import { generateRunId } from './runid.js';

if (process.argv[2] === 'generate-id') {
  console.log(generateRunId());
}

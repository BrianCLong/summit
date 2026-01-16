import { z } from "zod";

// Base types based on OpenLineage spec
export const BaseEntity = z.object({
  namespace: z.string(),
  name: z.string(),
  facets: z.record(z.any()).optional(),
});

export const Run = z.object({
  runId: z.string().uuid(),
  facets: z.record(z.any()).optional(),
});

export const Job = BaseEntity;
export const Dataset = BaseEntity;

export const EventType = z.enum(["START", "RUNNING", "COMPLETE", "ABORT", "FAIL", "OTHER"]);

export const OpenLineageEvent = z.object({
  eventType: EventType,
  eventTime: z.string().datetime(),
  run: Run,
  job: Job,
  inputs: z.array(Dataset).optional(),
  outputs: z.array(Dataset).optional(),
  producer: z.string().url(),
  schemaURL: z.string().url().optional(),
});

export type OpenLineageEventType = z.infer<typeof OpenLineageEvent>;
export type RunType = z.infer<typeof Run>;
export type JobType = z.infer<typeof Job>;
export type DatasetType = z.infer<typeof Dataset>;

/**
 * LineageEmitter
 *
 * Responsible for constructing and emitting deterministic OpenLineage events.
 */
export class LineageEmitter {
  private producerId: string;

  constructor(producerId: string) {
    this.producerId = producerId;
  }

  /**
   * Create an event object.
   * Note: This does not emit to a transport layer, it just constructs the payload.
   */
  createEvent(
    eventType: z.infer<typeof EventType>,
    runId: string,
    jobNamespace: string,
    jobName: string,
    inputs: DatasetType[] = [],
    outputs: DatasetType[] = []
  ): OpenLineageEventType {
    const event: OpenLineageEventType = {
      eventType,
      eventTime: new Date().toISOString(),
      run: {
        runId,
        facets: {},
      },
      job: {
        namespace: jobNamespace,
        name: jobName,
        facets: {},
      },
      inputs,
      outputs,
      producer: this.producerId,
    };

    // Validate against Zod schema
    return OpenLineageEvent.parse(event);
  }

  // Placeholder for future transport integration
  async emit(event: OpenLineageEventType): Promise<void> {
    console.log(JSON.stringify(event, null, 2));
  }
}

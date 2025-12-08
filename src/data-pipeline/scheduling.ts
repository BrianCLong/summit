import { ScheduleSpec, ScheduleTask } from './types.js';

export class AirflowScheduleBuilder {
  constructor(private readonly dagId: string) {}

  build(cron: string, tasks: ScheduleTask[], metadata: Record<string, unknown> = {}): ScheduleSpec {
    return {
      executor: 'airflow',
      schedule: cron,
      tasks,
      metadata: {
        dagId: this.dagId,
        catchup: false,
        maxActiveRuns: 1,
        ...metadata,
      },
    };
  }
}

export class TemporalScheduleBuilder {
  constructor(private readonly workflow: string) {}

  build(
    interval: string,
    tasks: ScheduleTask[],
    metadata: Record<string, unknown> = {}
  ): ScheduleSpec {
    return {
      executor: 'temporal',
      schedule: interval,
      tasks,
      metadata: {
        workflow: this.workflow,
        retryPolicy: {
          maximumAttempts: 5,
          initialInterval: '10s',
        },
        ...metadata,
      },
    };
  }
}

export interface TimelineEvent {
  timestamp: string;
  message: string;
  metadata?: Record<string, unknown>;
}

export class TimelineService {
  private static instance: TimelineService;
  private timelines: Map<string, TimelineEvent[]> = new Map();

  private constructor() {}

  public static getInstance(): TimelineService {
    if (!TimelineService.instance) {
      TimelineService.instance = new TimelineService();
    }
    return TimelineService.instance;
  }

  public addEvent(incidentId: string, message: string, metadata?: Record<string, unknown>): void {
    const events = this.timelines.get(incidentId) || [];
    events.push({
      timestamp: new Date().toISOString(),
      message,
      metadata,
    });
    this.timelines.set(incidentId, events);
  }

  public getTimeline(incidentId: string): TimelineEvent[] {
    return this.timelines.get(incidentId) || [];
  }
}

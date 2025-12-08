import { TransformationStep } from './types.js';

export interface LineageEvent {
  lineageId: string;
  source: string;
  transformations: string[];
  timestamp: number;
}

export class LineageTracker {
  private readonly events: LineageEvent[] = [];

  createId(source: string): string {
    return `${source}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  }

  record(source: string, lineageId: string, steps: TransformationStep[]): void {
    const event: LineageEvent = {
      lineageId,
      source,
      transformations: steps.map((step) => step.name || 'anonymous'),
      timestamp: Date.now(),
    };
    this.events.push(event);
  }

  history(): LineageEvent[] {
    return [...this.events];
  }
}

export interface ActionExecutedEvent {
  type: "action.executed";
  preflightId: string;
  correlationId: string;
  action?: string;
  payload: unknown;
}

export class EventPublisher {
  public readonly events: ActionExecutedEvent[] = [];

  publish(event: ActionExecutedEvent): void {
    this.events.push(event);
  }
}

export interface FlightRecord {
  taskId: string;
  agentId: string;
  decision: 'allowed' | 'denied';
  reasons: string[];
}

export class FlightRecorder {
  private readonly records: FlightRecord[] = [];

  record(entry: FlightRecord): void {
    this.records.push(entry);
  }

  list(): FlightRecord[] {
    return [...this.records];
  }
}

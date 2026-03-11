export function formatEvents(events: any[]): any[] {
  return events.map(e => ({
    ...e,
    _formatted: true
  }));
}

export function convertMetrics(metrics: any): any {
  return {
    ...metrics,
    _converted: true
  };
}

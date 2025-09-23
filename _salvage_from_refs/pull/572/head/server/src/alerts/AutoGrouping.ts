interface Alert {
  id: string;
  dedupeKey?: string;
  entities?: string[];
  createdAt: number;
}

export function groupAlerts(alerts: Alert[]): Alert[][] {
  const byKey = new Map<string, Alert[]>();
  for (const a of alerts) {
    const key = a.dedupeKey || a.id;
    if (!byKey.has(key)) byKey.set(key, []);
    byKey.get(key)!.push(a);
  }
  return Array.from(byKey.values());
}

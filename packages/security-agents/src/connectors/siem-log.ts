export interface SiemEvent {
  id: string;
  category: string;
  timestamp: string;
  attributes: Record<string, unknown>;
}

export interface CorrelatedSignal {
  clusterId: string;
  score: number;
  members: SiemEvent[];
  rationale: string;
}

export const correlateEvents = (events: SiemEvent[]): CorrelatedSignal[] => {
  const clusters: CorrelatedSignal[] = [];
  events.forEach((event) => {
    clusters.push({
      clusterId: `cluster-${event.id}`,
      score: 0.5,
      members: [event],
      rationale: 'Similarity placeholder - plug real detector'
    });
  });
  return clusters;
};

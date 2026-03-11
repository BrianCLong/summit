interface MissionTimelineEvent {
  id: string;
  summary: string;
  timestamp: string;
}

interface MissionTimelineProps {
  events: MissionTimelineEvent[];
}

export function MissionTimeline({ events }: MissionTimelineProps) {
  return (
    <section aria-label="mission-timeline">
      <h3>Mission Timeline</h3>
      <p>Events: {events.length}</p>
    </section>
  );
}

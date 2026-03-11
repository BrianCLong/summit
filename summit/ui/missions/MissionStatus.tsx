interface MissionStatusProps {
  progress: number;
  coordinationSummary: string;
}

export function MissionStatus({ progress, coordinationSummary }: MissionStatusProps) {
  return (
    <section aria-label="mission-status">
      <h3>Mission Status</h3>
      <p>Progress: {progress}%</p>
      <p>{coordinationSummary}</p>
    </section>
  );
}

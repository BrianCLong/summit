export interface MissionOverview {
  id: string;
  name: string;
  investigations: number;
  activeAgents: number;
  threatIndicators: number;
  simulations: number;
}

interface MissionDashboardProps {
  mission: MissionOverview;
}

export function MissionDashboard({ mission }: MissionDashboardProps) {
  return (
    <section aria-label="mission-dashboard">
      <h2>Mission Dashboard: {mission.name}</h2>
      <p>Investigations: {mission.investigations}</p>
      <p>Agents: {mission.activeAgents}</p>
    </section>
  );
}

import { MaestroEvent, MaestroDecision, PlaneContribution, generateDecisionId } from "@summit/summit-maestro-events";

export interface ControlPlane {
  name: string;
  supports(eventType: string): boolean;
  evaluate(event: MaestroEvent): Promise<PlaneContribution>;
}

export class MaestroEngine {
  constructor(private readonly planes: ControlPlane[]) {}

  async decide(event: MaestroEvent): Promise<MaestroDecision> {
    const active = this.planes.filter((p) => p.supports(event.event_type));
    const contributions = await Promise.all(active.map((p) => p.evaluate(event)));

    const status =
      contributions.some((c) => c.recommendation === "deny") ? "deny" :
      contributions.some((c) => c.recommendation === "escalate") ? "escalate" :
      contributions.some((c) => c.recommendation === "allow_with_conditions") ? "allow_with_conditions" :
      "allow";

    return {
      decision_id: generateDecisionId(),
      event_id: event.event_id,
      timestamp: new Date().toISOString(),
      tenant_id: event.tenant_id,
      status,
      risk_score: 0.5, // Mock value, in real logic we would compute from planes
      planes: contributions,
      required_actions: [], // E.g., merge required actions from planes
    };
  }
}

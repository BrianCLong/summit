import { ControlPlane } from "@summit/summit-maestro-engine";
import { MaestroEvent, PlaneContribution } from "@summit/summit-maestro-events";

export class EpistemicPlane implements ControlPlane {
  name = "epistemic";

  supports(eventType: string): boolean {
    return ["intent.evaluate", "claim.register", "promotion.request"].includes(eventType);
  }

  async evaluate(event: MaestroEvent): Promise<PlaneContribution> {
    return {
      plane: "epistemic",
      status: "ok",
      details: {},
      recommendation: "allow",
    };
  }
}

import { ControlPlane } from "@summit/summit-maestro-engine";
import { MaestroEvent, PlaneContribution } from "@summit/summit-maestro-events";

export class GovernancePlane implements ControlPlane {
  name = "governance";

  supports(eventType: string): boolean {
    return ["intent.evaluate", "tool.invoke", "override.request"].includes(eventType);
  }

  async evaluate(event: MaestroEvent): Promise<PlaneContribution> {
    return {
      plane: "governance",
      status: "ok",
      details: {},
      recommendation: "allow",
    };
  }
}

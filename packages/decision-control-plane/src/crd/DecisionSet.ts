import { DecisionResource } from "./Decision.js";

export interface DecisionSetResource {
  apiVersion: string;
  kind: "DecisionSet";
  metadata: {
    name: string;
  };
  spec: {
    decisions: DecisionResource[];
  };
  status: {
    phase: "Pending" | "Ready" | "Blocked";
  };
}

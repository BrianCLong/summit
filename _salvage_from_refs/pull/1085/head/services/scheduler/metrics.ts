import client from "prom-client";
export const admissionDecision = new client.Counter({
  name: "admission_decision_total",
  help: "Count of admission decisions",
  labelNames: ["decision","tier","expert","reason"] as const
});

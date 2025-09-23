import client from "prom-client";
export const costCents = new client.Counter({
  name: "cost_cents_total", help: "Accumulated cost in cents",
  labelNames: ["tenant","expert","component"] as const
});

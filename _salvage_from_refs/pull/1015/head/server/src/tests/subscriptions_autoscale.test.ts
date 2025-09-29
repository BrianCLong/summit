import { hpaHints } from "../subscriptions/AutoScaleHints";

describe("subscriptions autoscale", () => {
  test("calculates replica count", () => {
    const hints = hpaHints({ inFlight: 70, max: 100, drops: 0, p95: 200 });
    expect(hints.desiredReplicas).toBeGreaterThan(0);
  });
});

import { dpCount, dpSum } from "../privacy/dp/Mechanisms";

describe("dp mechanisms", () => {
  test("dpCount enforces k-anonymity", () => {
    expect(() => dpCount(10, { epsilon: 1, delta: 1e-6, kMin: 20, mechanism: "laplace" })).toThrow();
  });

  test("dpSum adds noise", () => {
    const res = dpSum([1, 2, 3], { epsilon: 1, delta: 1e-6, kMin: 1, mechanism: "laplace" });
    expect(res.meta.noisy).toBe(true);
  });
});

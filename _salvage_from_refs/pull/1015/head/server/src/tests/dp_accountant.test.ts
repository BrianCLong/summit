import { Accountant, Budget } from "../privacy/dp/Accountant";

describe("dp accountant", () => {
  test("charges within cap", async () => {
    const store = new Map<string, Budget>();
    store.set("t1", { epsilonCap: 1, delta: 1e-6, spent: 0, windowMs: 1000, lastReset: Date.now() });
    const acc = new Accountant({
      get: async (k) => store.get(k),
      set: async (k, v) => void store.set(k, v),
    });
    await acc.charge("t1", 0.5);
    await expect(acc.charge("t1", 0.6)).rejects.toThrow("epsilon_budget_exceeded");
  });
});

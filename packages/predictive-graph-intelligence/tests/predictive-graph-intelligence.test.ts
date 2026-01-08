import { getPredictiveSignals } from "../src";

describe("Predictive Graph Intelligence", () => {
  it("should return an empty array of signals", () => {
    const signals = getPredictiveSignals();
    expect(signals).toEqual([]);
  });
});

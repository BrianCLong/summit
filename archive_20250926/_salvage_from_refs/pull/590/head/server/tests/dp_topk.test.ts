import { dpTopK } from "../src/privacy/dp/Histograms";

test("returns at most k items", () => {
  const raw = { a: 50, b: 40, c: 30 };
  const res = dpTopK(raw, 2, 1, 25);
  expect(res.items.length).toBeLessThanOrEqual(2);
});

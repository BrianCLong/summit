import { dpHistogram } from "../src/privacy/dp/Histograms";

test("suppresses buckets below kMin", () => {
  const raw = { a: 10, b: 30 };
  const res = dpHistogram(raw, 1, 25);
  expect(res.buckets.find((b) => b.key === "a")).toBeUndefined();
  expect(res.buckets.find((b) => b.key === "b")).toBeDefined();
});

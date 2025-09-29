import { renderHook, waitFor } from "@testing-library/react";
import useThreatInsights from "../src/hooks/useThreatInsights.js";

global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({ score: 0.42 }),
  }),
);

test("polls threat insights endpoint", async () => {
  const { result } = renderHook(() => useThreatInsights());
  await waitFor(() => expect(result.current).toBeTruthy());
  expect(fetch).toHaveBeenCalledWith("/threat/insights?target=global");
  expect(result.current.score).toBe(0.42);
});

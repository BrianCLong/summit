import { jsx as _jsx } from "react/jsx-runtime";
import { render, screen } from "@testing-library/react";
import * as api from "../../api";
import TenantCost from "../TenantCost";
test("renders total spend", async () => {
  jest.spyOn(api, "api").mockReturnValue({
    getTenantCostSummary: async () => ({
      totalUsd: 12.34,
      byPipeline: [],
      byModelProvider: [],
      recentRuns: [],
    }),
    getTenantCostSeries: async () => ({ points: [] }),
  });
  render(_jsx(TenantCost, { tenant: "acme" }));
  expect(await screen.findByText(/\$12\.34/)).toBeInTheDocument();
});

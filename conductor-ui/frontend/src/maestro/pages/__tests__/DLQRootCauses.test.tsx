import React from "react";
import { render, screen } from "@testing-library/react";
import * as api from "../../api";
import DLQRootCauses from "../DLQRootCauses";

test("lists groups", async () => {
  jest.spyOn(api, "api").mockReturnValue({
    getDLQRootCauses: async () => ({
      groups: [
        {
          stepId: "apply_patch",
          kind: "CLI_TASK",
          provider: "other",
          count: 3,
          lastTs: Date.now(),
          itemIds: [],
          signature: "sig",
          sampleError: "err",
        },
      ],
    }),
  } as any);
  render(<DLQRootCauses />);
  expect(await screen.findByText("apply_patch")).toBeInTheDocument();
});

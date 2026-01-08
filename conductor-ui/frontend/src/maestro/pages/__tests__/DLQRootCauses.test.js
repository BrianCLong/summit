import { jsx as _jsx } from "react/jsx-runtime";
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
  });
  render(_jsx(DLQRootCauses, {}));
  expect(await screen.findByText("apply_patch")).toBeInTheDocument();
});

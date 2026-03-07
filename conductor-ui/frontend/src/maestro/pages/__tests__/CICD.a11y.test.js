import { jsx as _jsx } from "react/jsx-runtime";
import { render } from "@testing-library/react";
// @ts-ignore: jest-axe types may not be available in this sandbox
import { axe } from "jest-axe";
import CICD from "../CICD";
it("CICD page is accessible", async () => {
  const { container } = render(_jsx(CICD, {}));
  const results = await axe(container);
  // @ts-ignore
  expect(results).toHaveNoViolations();
});

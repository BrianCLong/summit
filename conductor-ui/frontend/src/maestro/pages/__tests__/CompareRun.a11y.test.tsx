import React from "react";
import { render } from "@testing-library/react";
// @ts-ignore
import { axe } from "jest-axe";
import CompareRun from "../CompareRun";

it("CompareRun page is accessible", async () => {
  const { container } = render(<CompareRun />);
  const results = await axe(container);
  // @ts-ignore
  expect(results).toHaveNoViolations();
});

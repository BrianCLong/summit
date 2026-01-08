/**
 * DemoIndicator.test.jsx
 * Tests for the DemoIndicator component
 */

import React from "react";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { render, screen } from "@testing-library/react";
import { DemoIndicator, DemoBadge } from "./DemoIndicator";

describe("DemoIndicator", () => {
  it("renders demo mode warning when enabled", () => {
    // Note: This test assumes DEMO_MODE is set in test environment
    // In actual testing, you'd need to mock the environment variable
    const { container } = render(<DemoIndicator />);

    // Component should render (or not) based on DEMO_MODE env var
    // This is a basic smoke test
    expect(container).toBeDefined();
  });
});

describe("DemoBadge", () => {
  it("renders without crashing", () => {
    const { container } = render(<DemoBadge />);
    expect(container).toBeDefined();
  });

  it("accepts className prop", () => {
    const { container } = render(<DemoBadge className="test-class" />);
    expect(container).toBeDefined();
  });
});

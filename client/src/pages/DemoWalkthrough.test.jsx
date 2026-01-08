import React from "react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import DemoWalkthrough from "./DemoWalkthrough";

// Helper to render with router
const renderWithRouter = (component) => {
  return render(<BrowserRouter>{component}</BrowserRouter>);
};

describe("DemoWalkthrough", () => {
  afterEach(() => {
    // Reset import.meta.env after each test
    vi.unstubAllEnvs();
  });

  it("should be a function component", () => {
    expect(typeof DemoWalkthrough).toBe("function");
  });

  it("should render warning when demo mode is not enabled", () => {
    vi.stubEnv("VITE_DEMO_MODE", "0");

    renderWithRouter(<DemoWalkthrough />);

    expect(screen.getByText(/Demo Mode Not Enabled/i)).toBeInTheDocument();
  });

  it("should render walkthrough when demo mode is enabled", () => {
    vi.stubEnv("VITE_DEMO_MODE", "1");

    renderWithRouter(<DemoWalkthrough />);

    // Should show the walkthrough title
    expect(screen.getByText(/Summit Platform Demo Walkthrough/i)).toBeInTheDocument();
  });

  it("should have navigation buttons when demo mode is enabled", () => {
    vi.stubEnv("VITE_DEMO_MODE", "1");

    renderWithRouter(<DemoWalkthrough />);

    // Check for key navigation buttons
    expect(screen.getByRole("button", { name: /Go to Dashboard/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Open Graph Explorer/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Try AI Copilot/i })).toBeInTheDocument();
  });

  it("should show quick reference section", () => {
    vi.stubEnv("VITE_DEMO_MODE", "1");

    renderWithRouter(<DemoWalkthrough />);

    expect(screen.getByText(/Quick Reference/i)).toBeInTheDocument();
    expect(screen.getByText(/Sample Data Only/i)).toBeInTheDocument();
  });
});

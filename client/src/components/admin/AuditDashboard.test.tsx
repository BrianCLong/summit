import React from "react";
import { render, screen } from "@testing-library/react";
import AuditDashboard from "./AuditDashboard";

describe("AuditDashboard", () => {
  it("renders logs and resolutions", () => {
    render(<AuditDashboard />);
    expect(screen.getByTestId("audit-dashboard")).toBeInTheDocument();
    expect(screen.getByText("Recent Ingest Logs")).toBeInTheDocument();
    expect(screen.getByText("Entity Resolutions")).toBeInTheDocument();
  });
});

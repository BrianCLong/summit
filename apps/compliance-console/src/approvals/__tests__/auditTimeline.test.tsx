import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AuditTimeline } from "../AuditTimeline";
import { approvalsData } from "../mockData";

describe("AuditTimeline", () => {
  it("renders events sorted by time with correlation id", () => {
    const request = approvalsData[0];
    render(
      <AuditTimeline
        events={[...request.timeline].reverse()}
        correlationId={request.correlationId}
      />
    );

    expect(screen.getByText(/Correlation: corr-abc/)).toBeInTheDocument();
    expect(screen.getAllByRole("listitem")[0]).toHaveTextContent("Request submitted");
  });
});

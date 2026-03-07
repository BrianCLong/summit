import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import AuditTimeline, { CorrelatedAuditEvent } from "./AuditTimeline";

const mockFetcher = (events: CorrelatedAuditEvent[]) =>
  jest.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ data: events }),
  });

describe("AuditTimeline", () => {
  it("renders deep links for resource paths and labels", async () => {
    const fetcher = mockFetcher([
      {
        id: "1",
        timestamp: "2024-01-01T00:00:00Z",
        action: "create",
        resourcePath: "/investigations/123",
        resourceName: "Investigation 123",
        correlationId: "corr-1",
        outcome: "success",
      },
    ]);

    render(
      <AuditTimeline
        correlationIds={["corr-1"]}
        fetcher={fetcher}
        apiBaseUrl="http://example.test"
      />
    );

    await waitFor(() => expect(screen.getByText("Investigation 123")).toBeInTheDocument());

    const link = screen.getByTestId("resource-link");
    expect(link).toHaveAttribute("href", "/investigations/123");
    expect(screen.getByText("Correlation corr-1")).toBeInTheDocument();
  });

  it("shows fallbacks when data is missing", async () => {
    const fetcher = mockFetcher([
      {
        id: "2",
        correlationId: "corr-2",
      },
    ]);

    render(<AuditTimeline correlationIds={["corr-2"]} fetcher={fetcher} />);

    await waitFor(() => expect(screen.getByText("No details available")).toBeInTheDocument());

    expect(screen.getByText("No additional context provided.")).toBeInTheDocument();
    expect(screen.getByText("No resource link available")).toBeInTheDocument();
    expect(screen.getByText("Unknown time")).toBeInTheDocument();
  });
});

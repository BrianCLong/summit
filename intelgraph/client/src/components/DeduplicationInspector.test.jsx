import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MockedProvider } from "@apollo/client/testing";
import DeduplicationInspector from "./DeduplicationInspector";
import { GET_DEDUPLICATION_CANDIDATES, SUGGEST_MERGE } from "../graphql/deduplication";

const mocks = [
  {
    request: {
      query: GET_DEDUPLICATION_CANDIDATES,
    },
    result: {
      data: {
        deduplicationCandidates: [
          {
            entityA: {
              id: "1",
              label: "Entity A",
              description: "Description A",
              attributes: { source: "crm", score: 0.95 },
            },
            entityB: {
              id: "2",
              label: "Entity B",
              description: "Description B",
              attributes: { source: "erp", region: "emea" },
            },
            similarity: 0.9,
            reasons: ["High text similarity"],
          },
        ],
      },
    },
  },
  {
    request: {
      query: SUGGEST_MERGE,
      variables: { sourceId: "1", targetId: "2" },
    },
    result: {
      data: {
        suggestMerge: {
          id: "2",
          label: "Entity B",
          description: "Description B",
        },
      },
    },
  },
];

describe("DeduplicationInspector", () => {
  it("renders the component and fetches candidates", async () => {
    render(
      <MockedProvider mocks={mocks} addTypename={false}>
        <DeduplicationInspector />
      </MockedProvider>
    );

    expect(screen.getByText("Loading candidates...")).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText("Deduplication Inspector")).toBeInTheDocument();
      expect(screen.getByText("Similarity: 90.00%")).toBeInTheDocument();
      expect(screen.getByText("Reasons: High text similarity")).toBeInTheDocument();
      expect(screen.getByText("Entity A")).toBeInTheDocument();
      expect(screen.getByText("ID: 1")).toBeInTheDocument();
      expect(screen.getByText("Description A")).toBeInTheDocument();
      expect(screen.getByText("Entity B")).toBeInTheDocument();
      expect(screen.getByText("Description B")).toBeInTheDocument();
      expect(screen.getByText("Attributes")).toBeInTheDocument();
    });
  });

  it("calls the merge mutation when the merge button is clicked and shows status feedback", async () => {
    render(
      <MockedProvider mocks={mocks} addTypename={false}>
        <DeduplicationInspector />
      </MockedProvider>
    );

    await waitFor(() => {
      fireEvent.click(screen.getByText("Merge into Entity B"));
      expect(screen.getByText("Merging...")).toBeInTheDocument();
      expect(screen.getByText("Submitting merge to server...")).toBeInTheDocument();
    });

    // We can't easily test the result of the mutation, but we can
    // check that the component re-renders without the merged candidate.
    await waitFor(() => {
      expect(screen.queryByText("Similarity: 90.00%")).not.toBeInTheDocument();
      expect(screen.getByRole("alert")).toHaveTextContent("Merge completed successfully.");
    });
  });

  it("shows an error notification when merge fails", async () => {
    const errorMocks = [
      mocks[0],
      {
        request: {
          query: SUGGEST_MERGE,
          variables: { sourceId: "1", targetId: "2" },
        },
        error: new Error("network"),
      },
    ];

    render(
      <MockedProvider mocks={errorMocks} addTypename={false}>
        <DeduplicationInspector />
      </MockedProvider>
    );

    await waitFor(() => {
      fireEvent.click(screen.getByText("Merge into Entity B"));
    });

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("Merge failed: network");
    });
  });

  it("allows adjusting the similarity threshold to filter candidates", async () => {
    render(
      <MockedProvider mocks={mocks} addTypename={false}>
        <DeduplicationInspector />
      </MockedProvider>
    );

    await waitFor(() => {
      expect(screen.getByLabelText("Similarity threshold")).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText("Similarity threshold"), { target: { value: "0.95" } });

    await waitFor(() => {
      expect(screen.getByText("No candidates match the current threshold.")).toBeInTheDocument();
      expect(localStorage.getItem("deduplication.similarityThreshold")).toBe("0.95");
    });
  });
});

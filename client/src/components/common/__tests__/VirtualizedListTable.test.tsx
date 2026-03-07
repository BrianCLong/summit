import React from "react";
import { render, screen } from "@testing-library/react";
import VirtualizedListTable from "../VirtualizedListTable";

type Item = { id: string; name: string; status: string };

const items: Item[] = Array.from({ length: 40 }, (_, i) => ({
  id: `id-${i}`,
  name: `Row ${i}`,
  status: i % 2 === 0 ? "open" : "closed",
}));

const columns = [
  { key: "name", label: "Name", width: "2fr", render: (i: Item) => i.name },
  { key: "status", label: "Status", width: "1fr", render: (i: Item) => i.status },
];

describe("VirtualizedListTable", () => {
  it("renders only visible rows when virtualization is enabled", () => {
    render(
      <VirtualizedListTable
        items={items}
        columns={columns}
        height={160}
        rowHeight={40}
        virtualizationEnabled
        overscan={1}
        ariaLabel="virtualized table"
      />
    );

    expect(screen.getByText("Row 0")).toBeInTheDocument();
    expect(screen.queryByText("Row 15")).toBeNull();
  });

  it("renders all rows when virtualization is disabled", () => {
    render(
      <VirtualizedListTable
        items={items.slice(0, 5)}
        columns={columns}
        height={200}
        rowHeight={40}
        virtualizationEnabled={false}
        ariaLabel="static table"
      />
    );

    expect(screen.getByText("Row 0")).toBeInTheDocument();
    expect(screen.getByText("Row 4")).toBeInTheDocument();
  });
});

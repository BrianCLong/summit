import React from "react";
import { describe, expect, it } from "vitest";
import { act } from "react-dom/test-utils";
import { createRoot } from "react-dom/client";
import { GraphExperiencePanel } from "./GraphExperiencePanel.js";

function render(component: React.ReactElement) {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);

  return {
    container,
    root,
    unmount: () => {
      root.unmount();
      container.remove();
    },
  };
}

describe("GraphExperiencePanel", () => {
  it("surfaces hairball guidance for large dense graphs", () => {
    const { container, unmount, root } = render(
      <GraphExperiencePanel nodeCount={1500} edgeCount={4000} />
    );

    expect(container.textContent).toContain("Scale guard required");

    act(() => root.unmount());
    unmount();
  });

  it("reveals advanced analysis via progressive disclosure", () => {
    const { container, unmount } = render(<GraphExperiencePanel nodeCount={120} edgeCount={140} />);

    const toggle = container.querySelector("[data-accordion-toggle]") as HTMLButtonElement;
    expect(container.querySelector("[data-accordion-panel]")).toBeNull();

    act(() => {
      toggle?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(container.querySelector("[data-accordion-panel]")).not.toBeNull();
    expect(container.textContent).toContain("Graph Algorithms");
    expect(container.textContent).toContain("Narrative Simulation");

    unmount();
  });

  it("exposes contextual help for ML predictions by default expansion", () => {
    const { container, unmount } = render(
      <GraphExperiencePanel
        nodeCount={10}
        edgeCount={8}
        defaultExpandedSections={{ advanced: true }}
      />
    );

    const helperButton = container.querySelector(
      'button[aria-label="This predicts missing relationships using AI and calls out low-confidence links before merge."]'
    );

    expect(helperButton).not.toBeNull();
    expect(container.textContent).toContain("Predicts missing relationships using AI");

    unmount();
  });
});

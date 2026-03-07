import { act } from "react-dom/test-utils";
import { createRoot } from "react-dom/client";
import { describe, expect, it, vi } from "vitest";
import { MAX_VISIBLE_NODES, ProgressiveGraph } from "../src/index.js";
import { buildFixtureGraph } from "./fixtures/graph.js";

describe("ProgressiveGraph", () => {
  it("progressively reveals batches while keeping hover/select responsive", async () => {
    const { nodes, edges } = buildFixtureGraph(180);
    const onHover = vi.fn();
    const onSelect = vi.fn();
    const container = document.createElement("div");
    const root = createRoot(container);

    await act(async () => {
      root.render(
        <ProgressiveGraph
          nodes={nodes}
          edges={edges}
          initialBatchSize={24}
          onHoverNode={onHover}
          onSelectNode={onSelect}
        />
      );
      await Promise.resolve();
    });

    const region = container.querySelector('[role="region"]');
    expect(region?.getAttribute("aria-busy")).toBe("true");

    const renderedBatch = container.querySelectorAll("[data-node-id]").length;
    expect(renderedBatch).toBeGreaterThanOrEqual(24);
    expect(renderedBatch).toBeLessThan(nodes.length);

    const firstNode = container.querySelector('[data-node-id="node-0"]');
    expect(firstNode).toBeTruthy();

    await act(async () => {
      firstNode?.dispatchEvent(new MouseEvent("mouseenter", { bubbles: true }));
    });
    expect(onHover).toHaveBeenCalledWith("node-0");

    await act(async () => {
      firstNode?.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    });
    expect(onSelect).toHaveBeenCalledWith("node-0");
  });

  it("keeps hover/select responsive while rendering remains busy", async () => {
    const { nodes, edges } = buildFixtureGraph(320);
    const onHover = vi.fn();
    const onSelect = vi.fn();
    const container = document.createElement("div");
    const root = createRoot(container);

    await act(async () => {
      root.render(
        <ProgressiveGraph
          nodes={nodes}
          edges={edges}
          initialBatchSize={12}
          frameBudgetMs={6}
          onHoverNode={onHover}
          onSelectNode={onSelect}
        />
      );
      await Promise.resolve();
    });

    const renderSurface = container.querySelector("[data-rendered-count]");
    const renderedCount = Number(renderSurface?.getAttribute("data-rendered-count"));
    expect(renderedCount).toBeGreaterThan(0);
    expect(renderedCount).toBeLessThan(nodes.length);

    const firstNode = container.querySelector('[data-node-id="node-0"]');
    expect(firstNode).toBeTruthy();

    await act(async () => {
      firstNode?.dispatchEvent(new MouseEvent("mouseenter", { bubbles: true }));
      firstNode?.dispatchEvent(
        new KeyboardEvent("keydown", { key: " ", bubbles: true, code: "Space" })
      );
    });

    expect(onHover).toHaveBeenCalledWith("node-0");
    expect(onSelect).toHaveBeenCalledWith("node-0");
  });

  it("lowers detail level automatically when load exceeds threshold", async () => {
    const { nodes, edges } = buildFixtureGraph(520);
    const container = document.createElement("div");
    const root = createRoot(container);

    await act(async () => {
      root.render(
        <ProgressiveGraph nodes={nodes} edges={edges} initialBatchSize={40} frameBudgetMs={10} />
      );
      await Promise.resolve();
    });

    const lod = container.querySelector("[data-lod]")?.getAttribute("data-lod");
    expect(lod).toBe("compact");

    const labels = Array.from(container.querySelectorAll("[data-node-id]")).map(
      (node) => (node as HTMLButtonElement).textContent
    );
    expect(labels.some((label) => label?.includes("…"))).toBe(true);
  });

  it("caps visible nodes under compact LOD while reporting elided counts", async () => {
    const { nodes, edges } = buildFixtureGraph(2400, 40, 3);
    const container = document.createElement("div");
    const root = createRoot(container);

    await act(async () => {
      root.render(
        <ProgressiveGraph nodes={nodes} edges={edges} initialBatchSize={120} frameBudgetMs={10} />
      );
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    const region = container.querySelector('[role="region"]');
    const visibleCount = Number(region?.getAttribute("data-visible-count") ?? "0");
    const elidedCount = Number(region?.getAttribute("data-elided-count") ?? "0");
    const lod = region?.getAttribute("data-lod");

    expect(lod).toBe("compact");
    expect(visibleCount).toBeGreaterThan(0);
    expect(visibleCount).toBeLessThan(nodes.length);
    expect(elidedCount).toBe(nodes.length - visibleCount);
    expect(container.querySelectorAll("[data-node-id]").length).toBe(visibleCount);
    expect(region?.getAttribute("aria-busy")).toBe("false");
  });

  it("preserves progress when streaming batches arrive", async () => {
    const first = buildFixtureGraph(60);
    const next = buildFixtureGraph(140);
    const container = document.createElement("div");
    const root = createRoot(container);

    await act(async () => {
      root.render(
        <ProgressiveGraph
          streaming
          nodes={first.nodes}
          edges={first.edges}
          initialBatchSize={18}
          frameBudgetMs={6}
        />
      );
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    const firstRendered = Number(
      container.querySelector("[data-rendered-count]")?.getAttribute("data-rendered-count")
    );

    await act(async () => {
      root.render(
        <ProgressiveGraph
          streaming
          nodes={next.nodes}
          edges={next.edges}
          initialBatchSize={18}
          frameBudgetMs={6}
        />
      );
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    const region = container.querySelector('[role="region"]');
    const renderSurface = container.querySelector("[data-rendered-count]");
    const secondRendered = Number(renderSurface?.getAttribute("data-rendered-count") ?? "0");

    expect(secondRendered).toBeGreaterThanOrEqual(firstRendered);
    expect(region?.getAttribute("data-streaming")).toBe("true");
    expect(container.querySelector("[data-streaming-indicator]")).toBeTruthy();
  });
});

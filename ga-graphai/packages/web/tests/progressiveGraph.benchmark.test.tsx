import { act } from "react-dom/test-utils";
import { createRoot } from "react-dom/client";
import { describe, expect, it } from "vitest";
import { performance } from "node:perf_hooks";
import { MAX_VISIBLE_NODES, ProgressiveGraph } from "../src/index.js";
import { buildFixtureGraph } from "./fixtures/graph.js";

describe("ProgressiveGraph benchmark", () => {
  it("renders a dense fixture within the upper render budget", async () => {
    const { nodes, edges } = buildFixtureGraph(1800, 45, 4);
    const container = document.createElement("div");
    const root = createRoot(container);
    let renderDuration = 0;

    await act(async () => {
      const start = performance.now();
      await new Promise<void>((resolve) => {
        root.render(
          <ProgressiveGraph
            nodes={nodes}
            edges={edges}
            initialBatchSize={96}
            frameBudgetMs={10}
            onRenderComplete={(elapsed) => {
              renderDuration = elapsed;
              resolve();
            }}
          />
        );
      });
      renderDuration = renderDuration || performance.now() - start;
    });

    const renderedCount = Number(
      container.querySelector("[data-rendered-count]")?.getAttribute("data-rendered-count")
    );
    const region = container.querySelector('[role="region"]');
    const busy = region?.getAttribute("aria-busy");
    const visibleCount = Number(region?.getAttribute("data-visible-count") ?? "0");
    const elidedCount = Number(region?.getAttribute("data-elided-count") ?? "0");
    const lod = region?.getAttribute("data-lod");

    expect(renderDuration).toBeGreaterThan(0);
    expect(renderDuration).toBeLessThan(140);
    expect(renderedCount).toBe(nodes.length);
    expect(busy === null || busy === "false").toBe(true);
    expect(lod).toBe("compact");
    expect(visibleCount).toBeGreaterThan(0);
    expect(visibleCount).toBeLessThan(nodes.length);
    expect(elidedCount).toBe(nodes.length - visibleCount);
  });

  it("streams large batches without regressing rendered progress", async () => {
    const initial = buildFixtureGraph(900, 40, 2);
    const expanded = buildFixtureGraph(1600, 40, 3);
    const container = document.createElement("div");
    const root = createRoot(container);

    await act(async () => {
      root.render(
        <ProgressiveGraph
          streaming
          nodes={initial.nodes}
          edges={initial.edges}
          initialBatchSize={72}
          frameBudgetMs={10}
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
          nodes={expanded.nodes}
          edges={expanded.edges}
          initialBatchSize={72}
          frameBudgetMs={10}
        />
      );
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    const region = container.querySelector('[role="region"]');
    const secondRendered = Number(
      container.querySelector("[data-rendered-count]")?.getAttribute("data-rendered-count") ?? "0"
    );
    const visibleCount = Number(region?.getAttribute("data-visible-count") ?? "0");

    expect(secondRendered).toBeGreaterThanOrEqual(firstRendered);
    expect(visibleCount).toBeGreaterThan(0);
  });
});

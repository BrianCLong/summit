import { describe, expect, it } from "vitest";
import { TriPaneController, type EvidenceNode } from "../src/index.js";

describe("Tri-pane time brush integration flow", () => {
  const fixture: EvidenceNode[] = [
    {
      id: "n1",
      label: "node-1",
      confidence: 0.8,
      policies: ["policy:a"],
      validFrom: Date.UTC(2024, 0, 1),
      validTo: Date.UTC(2024, 0, 2),
    },
    {
      id: "n2",
      label: "node-2",
      confidence: 0.9,
      policies: ["policy:b"],
      validFrom: Date.UTC(2024, 0, 3),
      validTo: Date.UTC(2024, 0, 3),
    },
    {
      id: "n3",
      label: "node-3",
      confidence: 0.7,
      policies: ["policy:a"],
      validFrom: Date.UTC(2024, 0, 5),
      validTo: Date.UTC(2024, 0, 6),
    },
    {
      id: "n4",
      label: "node-4",
      confidence: 0.5,
      policies: ["policy:c"],
      validFrom: Date.UTC(2024, 0, 6),
    },
  ];

  it("keeps graph and map synchronized after brushing and undo/redo", () => {
    const controller = new TriPaneController(fixture, {
      tenantId: "tenant-a",
      caseId: "case-1",
    });
    controller.selectFromGraph("root", fixture);
    controller.setTimeWindow({
      start: Date.UTC(2024, 0, 1),
      end: Date.UTC(2024, 0, 4),
    });

    expect(controller.current.evidence.map((e) => e.id)).toEqual(["n1", "n2"]);

    controller.setTimeWindow({
      start: Date.UTC(2024, 0, 5),
      end: Date.UTC(2024, 0, 6),
    });
    expect(controller.current.evidence.map((e) => e.id)).toEqual(["n3", "n4"]);

    controller.undo();
    expect(controller.current.evidence.map((e) => e.id)).toEqual(["n1", "n2"]);

    controller.redo();
    expect(controller.current.evidence.map((e) => e.id)).toEqual(["n3", "n4"]);
    const key = controller.buildQueryKey("tri-pane");
    expect(key).toContain("tenant-a");
    expect(key).toContain("case-1");
  });
});

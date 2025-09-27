const GraphVersionService = require("../src/services/GraphVersionService");

describe("GraphVersionService", () => {
  it("computes differences between snapshots", () => {
    const svc = new GraphVersionService();
    svc.saveSnapshot("v1", {
      nodes: [{ id: "a" }, { id: "b" }],
      edges: [{ id: "e1", source: "a", target: "b" }],
    });
    svc.saveSnapshot("v2", {
      nodes: [{ id: "b" }, { id: "c" }],
      edges: [
        { id: "e1", source: "a", target: "b" },
        { id: "e2", source: "b", target: "c" },
      ],
    });
    const diff = svc.diffSnapshots("v1", "v2");
    expect(diff.addedNodes).toEqual(["c"]);
    expect(diff.removedNodes).toEqual(["a"]);
    expect(diff.addedEdges).toEqual(["e2"]);
    expect(diff.removedEdges).toEqual([]);
  });
});

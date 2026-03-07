import { describe, expect, it } from "vitest";
import { materializeBG } from "../../src/graph/materializeBG.js";
import { makeFixtureWriteSets } from "../../src/testUtils/fixtures.js";

describe("golden: supersession lineage", () => {
  it("preserves supersedes lineage into materialized objects", () => {
    const [a, b] = makeFixtureWriteSets();
    const bg = materializeBG([a, b]);
    const target = bg.find((x) => x.memoryObjectId === b.memoryObjectId);

    expect(target).toBeDefined();
    expect(target?.lineage.supersedes).toEqual([a.writeSetId]);
  });
});

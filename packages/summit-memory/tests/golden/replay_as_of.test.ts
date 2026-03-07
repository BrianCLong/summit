import { describe, expect, it } from "vitest";
import { replayAsOf } from "../../src/temporal/replayAsOf.js";
import { makeFixtureWriteSets } from "../../src/testUtils/fixtures.js";

describe("golden: replay as of", () => {
  it("reconstructs memory state by ingest time", () => {
    const [a, b] = makeFixtureWriteSets();

    const result = replayAsOf([a, b], {
      entityId: "entity:alpha",
      asOfIngestTime: "2026-01-01T12:00:00.000Z"
    });

    expect(result.map((x) => x.writeSetId)).toEqual([a.writeSetId]);
  });
});

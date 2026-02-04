import { spawnSync } from "node:child_process";
import path from "node:path";

describe("subsumption bundle verifier", () => {
  it("fails when manifest is missing", () => {
    const result = spawnSync(
      "node",
      ["scripts/ci/verify_subsumption_bundle.mjs"],
      {
        env: {
          ...process.env,
          SUBSUMPTION_MANIFEST_PATH: path.join("subsumption", "missing.yaml"),
        },
      },
    );

    expect(result.status).toBe(1);
    expect(result.stderr.toString()).toContain("missing manifest");
  });
});

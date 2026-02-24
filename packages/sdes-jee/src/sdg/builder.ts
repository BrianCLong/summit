import { SdgSnapshot } from "./schema.js";
import fs from "fs";
import path from "path";

export class SdgBuilder {
  static fromFixture(fixturePath: string): SdgSnapshot {
    const content = fs.readFileSync(fixturePath, "utf-8");
    const snapshot = JSON.parse(content) as SdgSnapshot;
    return snapshot;
  }

  static buildEmpty(): SdgSnapshot {
    return {
      version: "empty",
      nodes: [],
      edges: []
    };
  }
}

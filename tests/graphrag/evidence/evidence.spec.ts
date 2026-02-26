import { describe, it, expect } from 'vitest';
import { buildEvidenceIndex, EvidenceIndexEntry } from "../../../src/graphrag/evidence/index";

describe("Evidence System", () => {
  it("should build a deterministic evidence index", () => {
    const entries: EvidenceIndexEntry[] = [
      { evidence_id: "EVD-B", files: ["file2.json"] },
      { evidence_id: "EVD-A", files: ["file1.json"] },
    ];
    const index = buildEvidenceIndex(entries);
    expect(index.version).toBe("1.0");
    expect(index.item_slug).toBe("INFOWAR");
    expect(index.entries[0].evidence_id).toBe("EVD-A");
    expect(index.entries[1].evidence_id).toBe("EVD-B");
  });

  it("should handle empty entries", () => {
    const index = buildEvidenceIndex([]);
    expect(index.entries).toHaveLength(0);
  });
});

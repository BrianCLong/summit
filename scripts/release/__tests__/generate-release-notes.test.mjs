// scripts/release/__tests__/generate-release-notes.test.mjs

import { test, describe } from "node:test";
import assert from "node:assert";
import { groupCommits } from "../generate-release-notes.mjs";

describe("Release Scripts: generate-release-notes", () => {
  const commits = [
    { subject: "feat: add new feature", body: "", hash: "1" },
    { subject: "fix: resolve bug", body: "", hash: "2" },
    { subject: "refactor!: breaking change", body: "", hash: "3" },
    { subject: "docs: update README", body: "", hash: "4" },
  ];

  test("should group commits correctly", () => {
    const groups = groupCommits(commits);
    assert.deepStrictEqual(groups, {
      "Breaking Changes": [{ subject: "refactor!: breaking change", body: "", hash: "3" }],
      Features: [{ subject: "feat: add new feature", body: "", hash: "1" }],
      Fixes: [{ subject: "fix: resolve bug", body: "", hash: "2" }],
      Other: [{ subject: "docs: update README", body: "", hash: "4" }],
    });
  });
});

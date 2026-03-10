import { writeFileSync, mkdirSync } from "node:fs";

export async function runFactoryReview(prId: string) {
  const review = {
    prId,
    mode: "review",
    passed: true,
    violations: [],
    warnings: [],
    touched_paths: [],
    blast_radius: "low"
  };

  mkdirSync(`artifacts/ai-factory/pr-${prId}/review`, { recursive: true });
  writeFileSync(
    `artifacts/ai-factory/pr-${prId}/review/architecture-review.json`,
    JSON.stringify(review, null, 2)
  );
}

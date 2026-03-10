import { writeFileSync, mkdirSync } from "node:fs";

export async function runFactoryFanout(issueId: string) {
  const stack = {
    issueId,
    mode: "fanout",
    workItems: []
  };

  mkdirSync(`artifacts/ai-factory/${issueId}/fanout`, { recursive: true });
  writeFileSync(
    `artifacts/ai-factory/${issueId}/fanout/stack.json`,
    JSON.stringify(stack, null, 2)
  );
}

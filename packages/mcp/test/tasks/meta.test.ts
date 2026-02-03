import assert from "node:assert";
import { withTaskMeta, extractRelatedTaskId, TASK_META_KEY, RELATED_TASK_META_KEY } from "../../src/tasks/meta";
import { TaskMetaRequest } from "../../src/tasks/types";

console.log("Running meta.test.ts");

{
  const params = { foo: "bar" };
  const task: TaskMetaRequest = { taskId: "123", keepAlive: 1000 };
  const augmented = withTaskMeta(params, task);

  assert.strictEqual(augmented.foo, "bar");
  assert.deepStrictEqual(augmented._meta[TASK_META_KEY], { taskId: "123", keepAlive: 1000 });
}
{
  const params = {
    _meta: {
      [RELATED_TASK_META_KEY]: { taskId: "789" }
    }
  };
  const extracted = extractRelatedTaskId(params);
  assert.strictEqual(extracted, "789");
}
console.log("meta.test.ts passed");

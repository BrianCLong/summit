import assert from "node:assert";
import { pollUntilTerminal } from "../../src/tasks/poll";
import { TaskClient, JsonRpcClient } from "../../src/tasks/task_client";
import { TaskGetResult } from "../../src/tasks/types";

console.log("Running poll.test.ts");

class MockRpc implements JsonRpcClient {
  private callCount = 0;
  constructor(private responses: TaskGetResult[]) {}
  async request<T>(method: string, params?: any): Promise<T> {
    if (method === "tasks/get") {
      const response = this.responses[this.callCount];
      if (response) {
        this.callCount++;
        return response as T;
      }
      return this.responses[this.responses.length - 1] as T;
    }
    throw new Error(`Unexpected method ${method}`);
  }
  notify() {}
}

async function runTests() {
    {
      const responses: TaskGetResult[] = [
        { taskId: "1", status: "working", keepAlive: null },
        { taskId: "1", status: "completed", keepAlive: null },
      ];
      const rpc = new MockRpc(responses);
      const tasks = new TaskClient(rpc);
      const result = await pollUntilTerminal({ tasks, taskId: "1", defaultPollMs: 10 });
      assert.strictEqual(result.status, "completed");
    }
}
runTests().catch(err => { console.error(err); process.exit(1); });

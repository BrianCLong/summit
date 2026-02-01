import { Job, JobHandler } from "./types";
// @ts-ignore
import { TaskClient } from "@intelgraph/mcp";
// @ts-ignore
import { pollUntilTerminal } from "@intelgraph/mcp/src/tasks/poll";

interface McpTaskJobData {
  taskId: string;
  pollConfig?: { defaultPollMs?: number; maxMs?: number; };
}

export class McpTaskJobHandler implements JobHandler {
  constructor(private tasks: TaskClient) {}

  async run(job: Job): Promise<any> {
    const data = job.data as McpTaskJobData;
    if (!data.taskId) throw new Error("Missing taskId");

    const terminalState = await (pollUntilTerminal as any)({
      tasks: this.tasks,
      taskId: data.taskId,
      defaultPollMs: data.pollConfig?.defaultPollMs,
      maxMs: data.pollConfig?.maxMs,
    });

    if (terminalState.status === "completed") {
      return await this.tasks.result(data.taskId);
    } else if (terminalState.status === "failed") {
        throw new Error(terminalState.error || "Task failed");
    } else if (terminalState.status === "cancelled") {
        throw new Error("Task cancelled");
    }
    return terminalState;
  }
}

import { AUTOMATION_WORKFLOWS, runAutomationWorkflow } from "../src/automation.js";

describe("automation workflows", () => {
  test("runs steps sequentially with provided runner", async () => {
    const commands: string[] = [];
    const report = await runAutomationWorkflow("init", {
      runner: async (command) => {
        commands.push(command);
        return { stdout: "ok", stderr: "", exitCode: 0 };
      },
    });

    expect(commands).toEqual(AUTOMATION_WORKFLOWS.init.map((step) => step.command));
    expect(report.summary.successCount).toBe(report.summary.total);
    expect(report.summary.failedCount).toBe(0);
  });

  test("marks failures and preserves output", async () => {
    const report = await runAutomationWorkflow("check", {
      runner: async (command) => {
        if (command.includes("lint")) {
          return { stdout: "", stderr: "lint error", exitCode: 1 };
        }
        return { stdout: "ok", stderr: "", exitCode: 0 };
      },
    });

    const failure = report.results.find((result) => result.status === "failed");
    expect(failure?.stderr).toContain("lint error");
    expect(report.summary.failedCount).toBe(1);
  });
});

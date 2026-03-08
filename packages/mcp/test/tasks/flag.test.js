"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_assert_1 = __importDefault(require("node:assert"));
const sdk_1 = require("../../src/tasks/sdk");
const task_client_1 = require("../../src/tasks/task_client");
console.log("Running flag.test.ts");
class MockRpc {
    async request(method, params) {
        if (params._meta && params._meta["modelcontextprotocol.io/task"]) {
            return "augmented";
        }
        return "direct";
    }
    notify() { }
}
async function runTests() {
    const rpc = new MockRpc();
    const tasks = new task_client_1.TaskClient(rpc);
    // Test 1: Flag Disabled (default or '0')
    {
        process.env.SUMMIT_MCP_TASKS = '0';
        const res = await (0, sdk_1.callWithTask)(rpc, tasks, "test", {});
        node_assert_1.default.equal(res, "direct");
        console.log("Flag Disabled passed");
    }
    // Test 2: Flag Enabled
    {
        process.env.SUMMIT_MCP_TASKS = '1';
        // Mock get to fail so it returns "direct" but "augmented" (wait, my logic returns request result if poll fails)
        // Actually, if flag enabled, `callWithTask` adds meta.
        // The request method returns "augmented" if meta is present.
        // `callWithTask` calls `request`.
        // Then it probes `tasks.get`.
        // We need to mock `tasks.get` to fail (throw) so it falls back to result.
        tasks.get = async () => { throw new Error("Not found"); };
        const res = await (0, sdk_1.callWithTask)(rpc, tasks, "test", {});
        node_assert_1.default.equal(res, "augmented");
        console.log("Flag Enabled passed (fallback to augmented request)");
    }
}
runTests().catch(e => {
    console.error(e);
    process.exit(1);
});

"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_assert_1 = __importDefault(require("node:assert"));
const poll_1 = require("../../src/tasks/poll");
const task_client_1 = require("../../src/tasks/task_client");
console.log("Running poll.test.ts");
class MockRpc {
    responses;
    callCount = 0;
    constructor(responses) {
        this.responses = responses;
    }
    async request(method, params) {
        if (method === "tasks/get") {
            const response = this.responses[this.callCount];
            if (response) {
                this.callCount++;
                return response;
            }
            return this.responses[this.responses.length - 1];
        }
        throw new Error(`Unexpected method ${method}`);
    }
    notify() { }
}
async function runTests() {
    {
        const responses = [
            { taskId: "1", status: "working", keepAlive: null },
            { taskId: "1", status: "completed", keepAlive: null },
        ];
        const rpc = new MockRpc(responses);
        const tasks = new task_client_1.TaskClient(rpc);
        const result = await (0, poll_1.pollUntilTerminal)({ tasks, taskId: "1", defaultPollMs: 10 });
        node_assert_1.default.strictEqual(result.status, "completed");
    }
}
runTests().catch(err => { console.error(err); process.exit(1); });

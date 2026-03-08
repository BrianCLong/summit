"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_assert_1 = __importDefault(require("node:assert"));
const meta_1 = require("../../src/tasks/meta");
console.log("Running meta.test.ts");
{
    const params = { foo: "bar" };
    const task = { taskId: "123", keepAlive: 1000 };
    const augmented = (0, meta_1.withTaskMeta)(params, task);
    node_assert_1.default.strictEqual(augmented.foo, "bar");
    node_assert_1.default.deepStrictEqual(augmented._meta[meta_1.TASK_META_KEY], { taskId: "123", keepAlive: 1000 });
}
{
    const params = {
        _meta: {
            [meta_1.RELATED_TASK_META_KEY]: { taskId: "789" }
        }
    };
    const extracted = (0, meta_1.extractRelatedTaskId)(params);
    node_assert_1.default.strictEqual(extracted, "789");
}
console.log("meta.test.ts passed");

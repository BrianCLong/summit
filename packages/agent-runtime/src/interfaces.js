"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RuntimeConfigSchema = exports.AgentStatus = void 0;
const zod_1 = require("zod");
var AgentStatus;
(function (AgentStatus) {
    AgentStatus["PENDING"] = "PENDING";
    AgentStatus["RUNNING"] = "RUNNING";
    AgentStatus["PAUSED"] = "PAUSED";
    AgentStatus["COMPLETED"] = "COMPLETED";
    AgentStatus["FAILED"] = "FAILED";
})(AgentStatus || (exports.AgentStatus = AgentStatus = {}));
exports.RuntimeConfigSchema = zod_1.z.object({
    persistence: zod_1.z.boolean(),
    streaming: zod_1.z.boolean(),
    routingPolicy: zod_1.z.enum(["static", "dynamic"])
});

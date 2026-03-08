"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BillableEventType = void 0;
var BillableEventType;
(function (BillableEventType) {
    BillableEventType["READ_QUERY"] = "read_query";
    BillableEventType["PLANNING_RUN"] = "planning_run";
    BillableEventType["EVALUATION_RUN"] = "evaluation_run";
    BillableEventType["WRITE_ACTION"] = "write_action";
    BillableEventType["MULTI_AGENT_COORDINATION"] = "multi_agent_coordination";
    BillableEventType["PLUGIN_INVOCATION"] = "plugin_invocation";
})(BillableEventType || (exports.BillableEventType = BillableEventType = {}));

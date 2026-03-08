"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RunState = void 0;
var RunState;
(function (RunState) {
    RunState["Aborted"] = "ABORTED";
    RunState["Failed"] = "FAILED";
    RunState["Leased"] = "LEASED";
    RunState["Queued"] = "QUEUED";
    RunState["Running"] = "RUNNING";
    RunState["Succeeded"] = "SUCCEEDED";
    RunState["TimedOut"] = "TIMED_OUT";
})(RunState || (exports.RunState = RunState = {}));

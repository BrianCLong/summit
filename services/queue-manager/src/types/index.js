"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.JobStatus = exports.JobPriority = void 0;
var JobPriority;
(function (JobPriority) {
    JobPriority[JobPriority["CRITICAL"] = 1] = "CRITICAL";
    JobPriority[JobPriority["HIGH"] = 2] = "HIGH";
    JobPriority[JobPriority["NORMAL"] = 3] = "NORMAL";
    JobPriority[JobPriority["LOW"] = 4] = "LOW";
    JobPriority[JobPriority["BACKGROUND"] = 5] = "BACKGROUND";
})(JobPriority || (exports.JobPriority = JobPriority = {}));
var JobStatus;
(function (JobStatus) {
    JobStatus["WAITING"] = "waiting";
    JobStatus["ACTIVE"] = "active";
    JobStatus["COMPLETED"] = "completed";
    JobStatus["FAILED"] = "failed";
    JobStatus["DELAYED"] = "delayed";
    JobStatus["PAUSED"] = "paused";
})(JobStatus || (exports.JobStatus = JobStatus = {}));

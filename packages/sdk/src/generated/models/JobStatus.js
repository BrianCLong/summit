"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.JobStatus = void 0;
var JobStatus;
(function (JobStatus) {
    let status;
    (function (status) {
        status["PENDING"] = "pending";
        status["PROCESSING"] = "processing";
        status["COMPLETED"] = "completed";
        status["FAILED"] = "failed";
    })(status = JobStatus.status || (JobStatus.status = {}));
})(JobStatus || (exports.JobStatus = JobStatus = {}));

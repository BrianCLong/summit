"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GraphExportJob = void 0;
var GraphExportJob;
(function (GraphExportJob) {
    let status;
    (function (status) {
        status["PENDING"] = "pending";
        status["RUNNING"] = "running";
        status["COMPLETED"] = "completed";
        status["FAILED"] = "failed";
    })(status = GraphExportJob.status || (GraphExportJob.status = {}));
    let format;
    (function (format) {
        format["CSV"] = "csv";
        format["JSON"] = "json";
        format["PARQUET"] = "parquet";
    })(format = GraphExportJob.format || (GraphExportJob.format = {}));
})(GraphExportJob || (exports.GraphExportJob = GraphExportJob = {}));

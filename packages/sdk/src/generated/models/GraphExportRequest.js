"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GraphExportRequest = void 0;
var GraphExportRequest;
(function (GraphExportRequest) {
    let format;
    (function (format) {
        format["CSV"] = "csv";
        format["JSON"] = "json";
        format["PARQUET"] = "parquet";
    })(format = GraphExportRequest.format || (GraphExportRequest.format = {}));
})(GraphExportRequest || (exports.GraphExportRequest = GraphExportRequest = {}));

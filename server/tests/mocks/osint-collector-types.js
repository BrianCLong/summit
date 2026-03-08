"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TaskStatus = exports.CollectionType = void 0;
var CollectionType;
(function (CollectionType) {
    CollectionType["FEED"] = "FEED";
    CollectionType["CRAWL"] = "CRAWL";
})(CollectionType || (exports.CollectionType = CollectionType = {}));
var TaskStatus;
(function (TaskStatus) {
    TaskStatus["PENDING"] = "PENDING";
    TaskStatus["RUNNING"] = "RUNNING";
    TaskStatus["COMPLETED"] = "COMPLETED";
    TaskStatus["FAILED"] = "FAILED";
})(TaskStatus || (exports.TaskStatus = TaskStatus = {}));

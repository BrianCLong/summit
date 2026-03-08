"use strict";
/**
 * CQRS Projection Types
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProjectionStatus = void 0;
var ProjectionStatus;
(function (ProjectionStatus) {
    ProjectionStatus["RUNNING"] = "running";
    ProjectionStatus["STOPPED"] = "stopped";
    ProjectionStatus["REBUILDING"] = "rebuilding";
    ProjectionStatus["ERROR"] = "error";
})(ProjectionStatus || (exports.ProjectionStatus = ProjectionStatus = {}));

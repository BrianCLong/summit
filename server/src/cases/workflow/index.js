"use strict";
/**
 * Case Workflow Engine - Main exports
 * Complete case management and workflow automation system
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApprovalRepo = exports.ParticipantRepo = exports.TaskRepo = exports.SLATracker = exports.WorkflowStateMachine = exports.CaseWorkflowService = void 0;
// Main service
var CaseWorkflowService_js_1 = require("./CaseWorkflowService.js");
Object.defineProperty(exports, "CaseWorkflowService", { enumerable: true, get: function () { return CaseWorkflowService_js_1.CaseWorkflowService; } });
// Core engines
var StateMachine_js_1 = require("./StateMachine.js");
Object.defineProperty(exports, "WorkflowStateMachine", { enumerable: true, get: function () { return StateMachine_js_1.WorkflowStateMachine; } });
var SLATracker_js_1 = require("./SLATracker.js");
Object.defineProperty(exports, "SLATracker", { enumerable: true, get: function () { return SLATracker_js_1.SLATracker; } });
// Repositories
var TaskRepo_js_1 = require("./repos/TaskRepo.js");
Object.defineProperty(exports, "TaskRepo", { enumerable: true, get: function () { return TaskRepo_js_1.TaskRepo; } });
var ParticipantRepo_js_1 = require("./repos/ParticipantRepo.js");
Object.defineProperty(exports, "ParticipantRepo", { enumerable: true, get: function () { return ParticipantRepo_js_1.ParticipantRepo; } });
var ApprovalRepo_js_1 = require("./repos/ApprovalRepo.js");
Object.defineProperty(exports, "ApprovalRepo", { enumerable: true, get: function () { return ApprovalRepo_js_1.ApprovalRepo; } });
// Types
__exportStar(require("./types.js"), exports);

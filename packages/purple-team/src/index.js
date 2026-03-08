"use strict";
/**
 * Purple Team Collaboration Package
 *
 * Comprehensive purple team capabilities including:
 * - Exercise management
 * - Detection validation
 * - IOC generation
 * - Control assessment
 * - After-action reporting
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
exports.ControlAssessor = exports.IOCGenerator = exports.SIEMRuleValidator = exports.ExerciseManager = void 0;
// Types
__exportStar(require("./types"), exports);
// Exercise Management
var exercise_manager_1 = require("./exercise/exercise-manager");
Object.defineProperty(exports, "ExerciseManager", { enumerable: true, get: function () { return exercise_manager_1.ExerciseManager; } });
// Detection Validation
var detection_validator_1 = require("./detection/detection-validator");
Object.defineProperty(exports, "SIEMRuleValidator", { enumerable: true, get: function () { return detection_validator_1.SIEMRuleValidator; } });
Object.defineProperty(exports, "IOCGenerator", { enumerable: true, get: function () { return detection_validator_1.IOCGenerator; } });
Object.defineProperty(exports, "ControlAssessor", { enumerable: true, get: function () { return detection_validator_1.ControlAssessor; } });

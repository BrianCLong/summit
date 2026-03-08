"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExerciseStatus = exports.ExerciseType = void 0;
/**
 * Exercise Types
 */
var ExerciseType;
(function (ExerciseType) {
    ExerciseType["TABLETOP"] = "tabletop";
    ExerciseType["LIVE_FIRE"] = "live-fire";
    ExerciseType["HYBRID"] = "hybrid";
    ExerciseType["SIMULATION"] = "simulation";
})(ExerciseType || (exports.ExerciseType = ExerciseType = {}));
/**
 * Exercise Status
 */
var ExerciseStatus;
(function (ExerciseStatus) {
    ExerciseStatus["PLANNED"] = "planned";
    ExerciseStatus["READY"] = "ready";
    ExerciseStatus["IN_PROGRESS"] = "in-progress";
    ExerciseStatus["PAUSED"] = "paused";
    ExerciseStatus["COMPLETED"] = "completed";
    ExerciseStatus["CANCELLED"] = "cancelled";
})(ExerciseStatus || (exports.ExerciseStatus = ExerciseStatus = {}));

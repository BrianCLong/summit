"use strict";
/**
 * Data Lineage Types
 * Types for tracking and visualizing data lineage
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ImpactLevel = exports.TransformationType = exports.LineageLevel = exports.LineageDirection = void 0;
/**
 * Lineage Direction
 */
var LineageDirection;
(function (LineageDirection) {
    LineageDirection["UPSTREAM"] = "UPSTREAM";
    LineageDirection["DOWNSTREAM"] = "DOWNSTREAM";
    LineageDirection["BOTH"] = "BOTH";
})(LineageDirection || (exports.LineageDirection = LineageDirection = {}));
/**
 * Lineage Level
 */
var LineageLevel;
(function (LineageLevel) {
    LineageLevel["TABLE"] = "TABLE";
    LineageLevel["COLUMN"] = "COLUMN";
    LineageLevel["TRANSFORMATION"] = "TRANSFORMATION";
})(LineageLevel || (exports.LineageLevel = LineageLevel = {}));
/**
 * Transformation Types
 */
var TransformationType;
(function (TransformationType) {
    TransformationType["COPY"] = "COPY";
    TransformationType["FILTER"] = "FILTER";
    TransformationType["AGGREGATE"] = "AGGREGATE";
    TransformationType["JOIN"] = "JOIN";
    TransformationType["UNION"] = "UNION";
    TransformationType["TRANSFORM"] = "TRANSFORM";
    TransformationType["CUSTOM"] = "CUSTOM";
})(TransformationType || (exports.TransformationType = TransformationType = {}));
/**
 * Impact Level
 */
var ImpactLevel;
(function (ImpactLevel) {
    ImpactLevel["LOW"] = "LOW";
    ImpactLevel["MEDIUM"] = "MEDIUM";
    ImpactLevel["HIGH"] = "HIGH";
    ImpactLevel["CRITICAL"] = "CRITICAL";
})(ImpactLevel || (exports.ImpactLevel = ImpactLevel = {}));

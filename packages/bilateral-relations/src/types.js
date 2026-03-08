"use strict";
/**
 * Bilateral Relations Monitoring Types
 * Comprehensive tracking of bilateral relationships between countries
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.CooperationLevel = exports.RelationshipStatus = void 0;
var RelationshipStatus;
(function (RelationshipStatus) {
    RelationshipStatus["STRATEGIC_PARTNERSHIP"] = "STRATEGIC_PARTNERSHIP";
    RelationshipStatus["COMPREHENSIVE_PARTNERSHIP"] = "COMPREHENSIVE_PARTNERSHIP";
    RelationshipStatus["NORMAL"] = "NORMAL";
    RelationshipStatus["STRAINED"] = "STRAINED";
    RelationshipStatus["TENSE"] = "TENSE";
    RelationshipStatus["HOSTILE"] = "HOSTILE";
    RelationshipStatus["SEVERED"] = "SEVERED";
    RelationshipStatus["FROZEN"] = "FROZEN";
    RelationshipStatus["NORMALIZING"] = "NORMALIZING";
    RelationshipStatus["IMPROVING"] = "IMPROVING";
    RelationshipStatus["DETERIORATING"] = "DETERIORATING";
})(RelationshipStatus || (exports.RelationshipStatus = RelationshipStatus = {}));
var CooperationLevel;
(function (CooperationLevel) {
    CooperationLevel["EXTENSIVE"] = "EXTENSIVE";
    CooperationLevel["SUBSTANTIAL"] = "SUBSTANTIAL";
    CooperationLevel["MODERATE"] = "MODERATE";
    CooperationLevel["LIMITED"] = "LIMITED";
    CooperationLevel["MINIMAL"] = "MINIMAL";
    CooperationLevel["NONE"] = "NONE";
})(CooperationLevel || (exports.CooperationLevel = CooperationLevel = {}));
lingering;
Effects: string[];

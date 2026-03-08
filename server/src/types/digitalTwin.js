"use strict";
/**
 * Digital Twin Infrastructure Types
 * Core type definitions for the digital twin system
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.HealthStatus = exports.TwinSyncState = exports.DisasterSubtype = exports.ScenarioType = exports.AssetType = void 0;
/**
 * Asset types for digital twin modeling
 */
var AssetType;
(function (AssetType) {
    AssetType["BUILDING"] = "BUILDING";
    AssetType["BRIDGE"] = "BRIDGE";
    AssetType["ROAD"] = "ROAD";
    AssetType["UTILITY"] = "UTILITY";
    AssetType["WATER_SYSTEM"] = "WATER_SYSTEM";
    AssetType["POWER_GRID"] = "POWER_GRID";
    AssetType["TELECOMMUNICATIONS"] = "TELECOMMUNICATIONS";
    AssetType["TRANSIT"] = "TRANSIT";
    AssetType["GREEN_SPACE"] = "GREEN_SPACE";
    AssetType["WASTE_MANAGEMENT"] = "WASTE_MANAGEMENT";
})(AssetType || (exports.AssetType = AssetType = {}));
/**
 * Scenario types for simulation
 */
var ScenarioType;
(function (ScenarioType) {
    ScenarioType["DISASTER"] = "DISASTER";
    ScenarioType["MAINTENANCE"] = "MAINTENANCE";
    ScenarioType["URBAN_PLANNING"] = "URBAN_PLANNING";
    ScenarioType["TRAFFIC"] = "TRAFFIC";
    ScenarioType["CLIMATE"] = "CLIMATE";
})(ScenarioType || (exports.ScenarioType = ScenarioType = {}));
/**
 * Disaster subtypes for detailed simulation
 */
var DisasterSubtype;
(function (DisasterSubtype) {
    DisasterSubtype["EARTHQUAKE"] = "EARTHQUAKE";
    DisasterSubtype["FLOOD"] = "FLOOD";
    DisasterSubtype["FIRE"] = "FIRE";
    DisasterSubtype["HURRICANE"] = "HURRICANE";
    DisasterSubtype["TSUNAMI"] = "TSUNAMI";
})(DisasterSubtype || (exports.DisasterSubtype = DisasterSubtype = {}));
/**
 * Synchronization state for twin assets
 */
var TwinSyncState;
(function (TwinSyncState) {
    TwinSyncState["SYNCED"] = "SYNCED";
    TwinSyncState["PENDING"] = "PENDING";
    TwinSyncState["STALE"] = "STALE";
    TwinSyncState["ERROR"] = "ERROR";
    TwinSyncState["OFFLINE"] = "OFFLINE";
})(TwinSyncState || (exports.TwinSyncState = TwinSyncState = {}));
/**
 * Health status for assets
 */
var HealthStatus;
(function (HealthStatus) {
    HealthStatus["EXCELLENT"] = "EXCELLENT";
    HealthStatus["GOOD"] = "GOOD";
    HealthStatus["FAIR"] = "FAIR";
    HealthStatus["POOR"] = "POOR";
    HealthStatus["CRITICAL"] = "CRITICAL";
})(HealthStatus || (exports.HealthStatus = HealthStatus = {}));

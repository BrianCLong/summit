"use strict";
/**
 * Nuclear Monitoring Type Definitions
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.TechnologyLevel = exports.FuelCycleStage = exports.TestType = exports.ConfidenceLevel = exports.FacilityStatus = exports.FacilityType = void 0;
var FacilityType;
(function (FacilityType) {
    // Enrichment Facilities
    FacilityType["ENRICHMENT_PLANT"] = "enrichment_plant";
    FacilityType["CENTRIFUGE_FACILITY"] = "centrifuge_facility";
    FacilityType["GASEOUS_DIFFUSION"] = "gaseous_diffusion";
    // Reprocessing
    FacilityType["REPROCESSING_PLANT"] = "reprocessing_plant";
    FacilityType["SPENT_FUEL_FACILITY"] = "spent_fuel_facility";
    // Reactors
    FacilityType["POWER_REACTOR"] = "power_reactor";
    FacilityType["RESEARCH_REACTOR"] = "research_reactor";
    FacilityType["BREEDER_REACTOR"] = "breeder_reactor";
    FacilityType["PRODUCTION_REACTOR"] = "production_reactor";
    // Fuel Cycle
    FacilityType["URANIUM_MINE"] = "uranium_mine";
    FacilityType["URANIUM_MILL"] = "uranium_mill";
    FacilityType["CONVERSION_FACILITY"] = "conversion_facility";
    FacilityType["FUEL_FABRICATION"] = "fuel_fabrication";
    // Testing and Storage
    FacilityType["TEST_SITE"] = "test_site";
    FacilityType["WASTE_STORAGE"] = "waste_storage";
    FacilityType["DISPOSAL_SITE"] = "disposal_site";
    // Other
    FacilityType["RESEARCH_LAB"] = "research_lab";
    FacilityType["HEAVY_WATER_PLANT"] = "heavy_water_plant";
    FacilityType["UNKNOWN"] = "unknown";
})(FacilityType || (exports.FacilityType = FacilityType = {}));
var FacilityStatus;
(function (FacilityStatus) {
    FacilityStatus["OPERATIONAL"] = "operational";
    FacilityStatus["UNDER_CONSTRUCTION"] = "under_construction";
    FacilityStatus["PLANNED"] = "planned";
    FacilityStatus["SUSPENDED"] = "suspended";
    FacilityStatus["SHUTDOWN"] = "shutdown";
    FacilityStatus["DECOMMISSIONED"] = "decommissioned";
    FacilityStatus["UNKNOWN"] = "unknown";
})(FacilityStatus || (exports.FacilityStatus = FacilityStatus = {}));
var ConfidenceLevel;
(function (ConfidenceLevel) {
    ConfidenceLevel["CONFIRMED"] = "confirmed";
    ConfidenceLevel["HIGH"] = "high";
    ConfidenceLevel["MODERATE"] = "moderate";
    ConfidenceLevel["LOW"] = "low";
    ConfidenceLevel["SUSPECTED"] = "suspected";
})(ConfidenceLevel || (exports.ConfidenceLevel = ConfidenceLevel = {}));
var TestType;
(function (TestType) {
    TestType["ATMOSPHERIC"] = "atmospheric";
    TestType["UNDERGROUND"] = "underground";
    TestType["UNDERWATER"] = "underwater";
    TestType["SUBCRITICAL"] = "subcritical";
    TestType["SUSPECTED"] = "suspected";
})(TestType || (exports.TestType = TestType = {}));
var FuelCycleStage;
(function (FuelCycleStage) {
    FuelCycleStage["MINING"] = "mining";
    FuelCycleStage["MILLING"] = "milling";
    FuelCycleStage["CONVERSION"] = "conversion";
    FuelCycleStage["ENRICHMENT"] = "enrichment";
    FuelCycleStage["FUEL_FABRICATION"] = "fuel_fabrication";
    FuelCycleStage["REACTOR_OPERATION"] = "reactor_operation";
    FuelCycleStage["REPROCESSING"] = "reprocessing";
    FuelCycleStage["WASTE_MANAGEMENT"] = "waste_management";
})(FuelCycleStage || (exports.FuelCycleStage = FuelCycleStage = {}));
var TechnologyLevel;
(function (TechnologyLevel) {
    TechnologyLevel["ADVANCED"] = "advanced";
    TechnologyLevel["INTERMEDIATE"] = "intermediate";
    TechnologyLevel["DEVELOPING"] = "developing";
    TechnologyLevel["NASCENT"] = "nascent";
})(TechnologyLevel || (exports.TechnologyLevel = TechnologyLevel = {}));

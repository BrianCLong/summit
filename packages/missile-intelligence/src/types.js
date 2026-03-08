"use strict";
/**
 * Missile Intelligence Type Definitions
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConfidenceLevel = exports.DefenseType = exports.LaunchFacilityType = exports.TestType = exports.OperationalStatus = exports.WarheadType = exports.PropulsionType = exports.MissileClassification = exports.MissileType = void 0;
var MissileType;
(function (MissileType) {
    MissileType["BALLISTIC_ICBM"] = "ballistic_icbm";
    MissileType["BALLISTIC_IRBM"] = "ballistic_irbm";
    MissileType["BALLISTIC_MRBM"] = "ballistic_mrbm";
    MissileType["BALLISTIC_SRBM"] = "ballistic_srbm";
    MissileType["CRUISE_GROUND"] = "cruise_ground";
    MissileType["CRUISE_AIR"] = "cruise_air";
    MissileType["CRUISE_SEA"] = "cruise_sea";
    MissileType["HYPERSONIC_GLIDE"] = "hypersonic_glide";
    MissileType["HYPERSONIC_CRUISE"] = "hypersonic_cruise";
    MissileType["SPACE_LAUNCH"] = "space_launch";
    MissileType["ANTI_SATELLITE"] = "anti_satellite";
})(MissileType || (exports.MissileType = MissileType = {}));
var MissileClassification;
(function (MissileClassification) {
    MissileClassification["STRATEGIC"] = "strategic";
    MissileClassification["TACTICAL"] = "tactical";
    MissileClassification["THEATER"] = "theater";
    MissileClassification["INTERMEDIATE"] = "intermediate";
})(MissileClassification || (exports.MissileClassification = MissileClassification = {}));
var PropulsionType;
(function (PropulsionType) {
    PropulsionType["LIQUID_FUEL"] = "liquid_fuel";
    PropulsionType["SOLID_FUEL"] = "solid_fuel";
    PropulsionType["HYBRID"] = "hybrid";
    PropulsionType["RAMJET"] = "ramjet";
    PropulsionType["SCRAMJET"] = "scramjet";
    PropulsionType["ROCKET"] = "rocket";
})(PropulsionType || (exports.PropulsionType = PropulsionType = {}));
var WarheadType;
(function (WarheadType) {
    WarheadType["NUCLEAR"] = "nuclear";
    WarheadType["CONVENTIONAL"] = "conventional";
    WarheadType["CHEMICAL"] = "chemical";
    WarheadType["BIOLOGICAL"] = "biological";
    WarheadType["EMP"] = "emp";
    WarheadType["KINETIC"] = "kinetic";
})(WarheadType || (exports.WarheadType = WarheadType = {}));
var OperationalStatus;
(function (OperationalStatus) {
    OperationalStatus["OPERATIONAL"] = "operational";
    OperationalStatus["DEVELOPMENT"] = "development";
    OperationalStatus["TESTING"] = "testing";
    OperationalStatus["DEPLOYED"] = "deployed";
    OperationalStatus["RETIRED"] = "retired";
    OperationalStatus["SUSPECTED"] = "suspected";
})(OperationalStatus || (exports.OperationalStatus = OperationalStatus = {}));
var TestType;
(function (TestType) {
    TestType["FULL_RANGE"] = "full_range";
    TestType["REDUCED_RANGE"] = "reduced_range";
    TestType["SUBORBITAL"] = "suborbital";
    TestType["PROOF_OF_CONCEPT"] = "proof_of_concept";
    TestType["OPERATIONAL_TEST"] = "operational_test";
    TestType["FAILURE"] = "failure";
})(TestType || (exports.TestType = TestType = {}));
var LaunchFacilityType;
(function (LaunchFacilityType) {
    LaunchFacilityType["SILO"] = "silo";
    LaunchFacilityType["MOBILE_LAUNCHER"] = "mobile_launcher";
    LaunchFacilityType["SUBMARINE"] = "submarine";
    LaunchFacilityType["AIRCRAFT"] = "aircraft";
    LaunchFacilityType["SURFACE_SHIP"] = "surface_ship";
    LaunchFacilityType["SPACE_PORT"] = "space_port";
    LaunchFacilityType["TEST_RANGE"] = "test_range";
})(LaunchFacilityType || (exports.LaunchFacilityType = LaunchFacilityType = {}));
var DefenseType;
(function (DefenseType) {
    DefenseType["TERMINAL"] = "terminal";
    DefenseType["MIDCOURSE"] = "midcourse";
    DefenseType["BOOST_PHASE"] = "boost_phase";
    DefenseType["LAYERED"] = "layered";
})(DefenseType || (exports.DefenseType = DefenseType = {}));
var ConfidenceLevel;
(function (ConfidenceLevel) {
    ConfidenceLevel["CONFIRMED"] = "confirmed";
    ConfidenceLevel["HIGH"] = "high";
    ConfidenceLevel["MODERATE"] = "moderate";
    ConfidenceLevel["LOW"] = "low";
    ConfidenceLevel["SUSPECTED"] = "suspected";
})(ConfidenceLevel || (exports.ConfidenceLevel = ConfidenceLevel = {}));

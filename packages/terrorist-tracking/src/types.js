"use strict";
/**
 * Terrorist Tracking Types
 * Types and interfaces for terrorist organization monitoring and tracking
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.EventType = exports.FundingType = exports.OrganizationStatus = exports.Ideology = exports.OrganizationType = void 0;
var OrganizationType;
(function (OrganizationType) {
    OrganizationType["PRIMARY"] = "PRIMARY";
    OrganizationType["AFFILIATE"] = "AFFILIATE";
    OrganizationType["FRANCHISE"] = "FRANCHISE";
    OrganizationType["SPLINTER"] = "SPLINTER";
    OrganizationType["CELL"] = "CELL";
    OrganizationType["NETWORK"] = "NETWORK";
})(OrganizationType || (exports.OrganizationType = OrganizationType = {}));
var Ideology;
(function (Ideology) {
    Ideology["RELIGIOUS_EXTREMISM"] = "RELIGIOUS_EXTREMISM";
    Ideology["NATIONALIST"] = "NATIONALIST";
    Ideology["SEPARATIST"] = "SEPARATIST";
    Ideology["ETHNO_NATIONALIST"] = "ETHNO_NATIONALIST";
    Ideology["FAR_RIGHT"] = "FAR_RIGHT";
    Ideology["FAR_LEFT"] = "FAR_LEFT";
    Ideology["ANARCHIST"] = "ANARCHIST";
    Ideology["SINGLE_ISSUE"] = "SINGLE_ISSUE";
    Ideology["MIXED"] = "MIXED";
})(Ideology || (exports.Ideology = Ideology = {}));
var OrganizationStatus;
(function (OrganizationStatus) {
    OrganizationStatus["ACTIVE"] = "ACTIVE";
    OrganizationStatus["WEAKENED"] = "WEAKENED";
    OrganizationStatus["DORMANT"] = "DORMANT";
    OrganizationStatus["DEFUNCT"] = "DEFUNCT";
    OrganizationStatus["REORGANIZING"] = "REORGANIZING";
    OrganizationStatus["MERGED"] = "MERGED";
})(OrganizationStatus || (exports.OrganizationStatus = OrganizationStatus = {}));
var FundingType;
(function (FundingType) {
    FundingType["STATE_SPONSORSHIP"] = "STATE_SPONSORSHIP";
    FundingType["DONATIONS"] = "DONATIONS";
    FundingType["CRIMINAL_ACTIVITY"] = "CRIMINAL_ACTIVITY";
    FundingType["DRUG_TRAFFICKING"] = "DRUG_TRAFFICKING";
    FundingType["KIDNAPPING"] = "KIDNAPPING";
    FundingType["EXTORTION"] = "EXTORTION";
    FundingType["LEGITIMATE_BUSINESS"] = "LEGITIMATE_BUSINESS";
    FundingType["LOOTING"] = "LOOTING";
    FundingType["CRYPTOCURRENCY"] = "CRYPTOCURRENCY";
    FundingType["UNKNOWN"] = "UNKNOWN";
})(FundingType || (exports.FundingType = FundingType = {}));
var EventType;
(function (EventType) {
    EventType["FOUNDING"] = "FOUNDING";
    EventType["ATTACK"] = "ATTACK";
    EventType["LEADERSHIP_CHANGE"] = "LEADERSHIP_CHANGE";
    EventType["MERGER"] = "MERGER";
    EventType["SPLIT"] = "SPLIT";
    EventType["TERRITORY_GAIN"] = "TERRITORY_GAIN";
    EventType["TERRITORY_LOSS"] = "TERRITORY_LOSS";
    EventType["MAJOR_OPERATION"] = "MAJOR_OPERATION";
    EventType["FOREIGN_INTERVENTION"] = "FOREIGN_INTERVENTION";
    EventType["PEACE_AGREEMENT"] = "PEACE_AGREEMENT";
    EventType["DESIGNATION"] = "DESIGNATION";
})(EventType || (exports.EventType = EventType = {}));

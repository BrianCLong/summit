"use strict";
/**
 * Treaty and Agreement Monitoring Types
 * Comprehensive tracking of international treaties, agreements, and legal instruments
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.TreatyCategory = exports.TreatyStatus = exports.TreatyType = void 0;
var TreatyType;
(function (TreatyType) {
    TreatyType["BILATERAL_TREATY"] = "BILATERAL_TREATY";
    TreatyType["MULTILATERAL_TREATY"] = "MULTILATERAL_TREATY";
    TreatyType["FRAMEWORK_AGREEMENT"] = "FRAMEWORK_AGREEMENT";
    TreatyType["PROTOCOL"] = "PROTOCOL";
    TreatyType["CONVENTION"] = "CONVENTION";
    TreatyType["MEMORANDUM_OF_UNDERSTANDING"] = "MEMORANDUM_OF_UNDERSTANDING";
    TreatyType["EXECUTIVE_AGREEMENT"] = "EXECUTIVE_AGREEMENT";
    TreatyType["EXCHANGE_OF_NOTES"] = "EXCHANGE_OF_NOTES";
    TreatyType["JOINT_DECLARATION"] = "JOINT_DECLARATION";
    TreatyType["TREATY_AMENDMENT"] = "TREATY_AMENDMENT";
    TreatyType["SUPPLEMENTARY_AGREEMENT"] = "SUPPLEMENTARY_AGREEMENT";
    TreatyType["CONCORDAT"] = "CONCORDAT";
    TreatyType["CHARTER"] = "CHARTER";
    TreatyType["STATUTE"] = "STATUTE";
    TreatyType["COVENANT"] = "COVENANT";
})(TreatyType || (exports.TreatyType = TreatyType = {}));
var TreatyStatus;
(function (TreatyStatus) {
    TreatyStatus["PROPOSED"] = "PROPOSED";
    TreatyStatus["UNDER_NEGOTIATION"] = "UNDER_NEGOTIATION";
    TreatyStatus["NEGOTIATION_COMPLETED"] = "NEGOTIATION_COMPLETED";
    TreatyStatus["SIGNED"] = "SIGNED";
    TreatyStatus["RATIFICATION_PENDING"] = "RATIFICATION_PENDING";
    TreatyStatus["PARTIALLY_RATIFIED"] = "PARTIALLY_RATIFIED";
    TreatyStatus["IN_FORCE"] = "IN_FORCE";
    TreatyStatus["PROVISIONALLY_APPLIED"] = "PROVISIONALLY_APPLIED";
    TreatyStatus["SUSPENDED"] = "SUSPENDED";
    TreatyStatus["TERMINATED"] = "TERMINATED";
    TreatyStatus["WITHDRAWN"] = "WITHDRAWN";
    TreatyStatus["EXPIRED"] = "EXPIRED";
    TreatyStatus["SUPERSEDED"] = "SUPERSEDED";
})(TreatyStatus || (exports.TreatyStatus = TreatyStatus = {}));
var TreatyCategory;
(function (TreatyCategory) {
    TreatyCategory["PEACE_AND_SECURITY"] = "PEACE_AND_SECURITY";
    TreatyCategory["ARMS_CONTROL"] = "ARMS_CONTROL";
    TreatyCategory["NUCLEAR_NON_PROLIFERATION"] = "NUCLEAR_NON_PROLIFERATION";
    TreatyCategory["TRADE_AND_COMMERCE"] = "TRADE_AND_COMMERCE";
    TreatyCategory["HUMAN_RIGHTS"] = "HUMAN_RIGHTS";
    TreatyCategory["ENVIRONMENTAL"] = "ENVIRONMENTAL";
    TreatyCategory["CLIMATE"] = "CLIMATE";
    TreatyCategory["MARITIME"] = "MARITIME";
    TreatyCategory["AVIATION"] = "AVIATION";
    TreatyCategory["SPACE"] = "SPACE";
    TreatyCategory["TELECOMMUNICATIONS"] = "TELECOMMUNICATIONS";
    TreatyCategory["CULTURAL"] = "CULTURAL";
    TreatyCategory["EXTRADITION"] = "EXTRADITION";
    TreatyCategory["MUTUAL_LEGAL_ASSISTANCE"] = "MUTUAL_LEGAL_ASSISTANCE";
    TreatyCategory["TAXATION"] = "TAXATION";
    TreatyCategory["INVESTMENT"] = "INVESTMENT";
    TreatyCategory["INTELLECTUAL_PROPERTY"] = "INTELLECTUAL_PROPERTY";
    TreatyCategory["LABOR"] = "LABOR";
    TreatyCategory["HEALTH"] = "HEALTH";
    TreatyCategory["EDUCATION"] = "EDUCATION";
    TreatyCategory["REFUGEE"] = "REFUGEE";
    TreatyCategory["TERRITORIAL"] = "TERRITORIAL";
    TreatyCategory["BOUNDARY"] = "BOUNDARY";
})(TreatyCategory || (exports.TreatyCategory = TreatyCategory = {}));

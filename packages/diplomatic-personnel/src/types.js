"use strict";
/**
 * Diplomatic Personnel Tracking Types
 * Comprehensive types for tracking ambassadors, envoys, and diplomatic networks
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.SpecializationArea = exports.PostingType = exports.DiplomaticRank = void 0;
var DiplomaticRank;
(function (DiplomaticRank) {
    DiplomaticRank["AMBASSADOR"] = "AMBASSADOR";
    DiplomaticRank["AMBASSADOR_AT_LARGE"] = "AMBASSADOR_AT_LARGE";
    DiplomaticRank["AMBASSADOR_EXTRAORDINARY"] = "AMBASSADOR_EXTRAORDINARY";
    DiplomaticRank["HIGH_COMMISSIONER"] = "HIGH_COMMISSIONER";
    DiplomaticRank["PERMANENT_REPRESENTATIVE"] = "PERMANENT_REPRESENTATIVE";
    DiplomaticRank["CHARGE_D_AFFAIRES"] = "CHARGE_D_AFFAIRES";
    DiplomaticRank["MINISTER"] = "MINISTER";
    DiplomaticRank["MINISTER_COUNSELOR"] = "MINISTER_COUNSELOR";
    DiplomaticRank["COUNSELOR"] = "COUNSELOR";
    DiplomaticRank["FIRST_SECRETARY"] = "FIRST_SECRETARY";
    DiplomaticRank["SECOND_SECRETARY"] = "SECOND_SECRETARY";
    DiplomaticRank["THIRD_SECRETARY"] = "THIRD_SECRETARY";
    DiplomaticRank["ATTACHE"] = "ATTACHE";
    DiplomaticRank["SPECIAL_ENVOY"] = "SPECIAL_ENVOY";
    DiplomaticRank["SPECIAL_REPRESENTATIVE"] = "SPECIAL_REPRESENTATIVE";
    DiplomaticRank["CONSUL_GENERAL"] = "CONSUL_GENERAL";
    DiplomaticRank["CONSUL"] = "CONSUL";
    DiplomaticRank["VICE_CONSUL"] = "VICE_CONSUL";
})(DiplomaticRank || (exports.DiplomaticRank = DiplomaticRank = {}));
var PostingType;
(function (PostingType) {
    PostingType["BILATERAL_EMBASSY"] = "BILATERAL_EMBASSY";
    PostingType["CONSULATE"] = "CONSULATE";
    PostingType["CONSULATE_GENERAL"] = "CONSULATE_GENERAL";
    PostingType["PERMANENT_MISSION"] = "PERMANENT_MISSION";
    PostingType["SPECIAL_MISSION"] = "SPECIAL_MISSION";
    PostingType["LIAISON_OFFICE"] = "LIAISON_OFFICE";
    PostingType["INTERESTS_SECTION"] = "INTERESTS_SECTION";
    PostingType["DELEGATION"] = "DELEGATION";
})(PostingType || (exports.PostingType = PostingType = {}));
var SpecializationArea;
(function (SpecializationArea) {
    SpecializationArea["POLITICAL_AFFAIRS"] = "POLITICAL_AFFAIRS";
    SpecializationArea["ECONOMIC_AFFAIRS"] = "ECONOMIC_AFFAIRS";
    SpecializationArea["CONSULAR_AFFAIRS"] = "CONSULAR_AFFAIRS";
    SpecializationArea["PUBLIC_DIPLOMACY"] = "PUBLIC_DIPLOMACY";
    SpecializationArea["TRADE_PROMOTION"] = "TRADE_PROMOTION";
    SpecializationArea["DEFENSE_ATTACHE"] = "DEFENSE_ATTACHE";
    SpecializationArea["INTELLIGENCE"] = "INTELLIGENCE";
    SpecializationArea["CULTURAL_AFFAIRS"] = "CULTURAL_AFFAIRS";
    SpecializationArea["SCIENCE_TECHNOLOGY"] = "SCIENCE_TECHNOLOGY";
    SpecializationArea["HUMANITARIAN"] = "HUMANITARIAN";
    SpecializationArea["ENVIRONMENTAL"] = "ENVIRONMENTAL";
    SpecializationArea["MULTILATERAL"] = "MULTILATERAL";
    SpecializationArea["REGIONAL_SECURITY"] = "REGIONAL_SECURITY";
})(SpecializationArea || (exports.SpecializationArea = SpecializationArea = {}));

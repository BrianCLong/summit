"use strict";
/**
 * Extremism Monitor Types
 * Types for attack planning detection and extremist activity monitoring
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.CommunicationMedium = exports.TrainingType = exports.ExplosiveType = exports.WeaponType = exports.ThreatSeverity = exports.IndicatorType = exports.TargetType = exports.AttackStatus = void 0;
var AttackStatus;
(function (AttackStatus) {
    AttackStatus["PLANNING"] = "PLANNING";
    AttackStatus["PREPARATION"] = "PREPARATION";
    AttackStatus["IMMINENT"] = "IMMINENT";
    AttackStatus["EXECUTED"] = "EXECUTED";
    AttackStatus["DISRUPTED"] = "DISRUPTED";
    AttackStatus["ABANDONED"] = "ABANDONED";
})(AttackStatus || (exports.AttackStatus = AttackStatus = {}));
var TargetType;
(function (TargetType) {
    TargetType["CIVILIAN"] = "CIVILIAN";
    TargetType["GOVERNMENT"] = "GOVERNMENT";
    TargetType["MILITARY"] = "MILITARY";
    TargetType["INFRASTRUCTURE"] = "INFRASTRUCTURE";
    TargetType["RELIGIOUS"] = "RELIGIOUS";
    TargetType["ECONOMIC"] = "ECONOMIC";
    TargetType["SYMBOLIC"] = "SYMBOLIC";
    TargetType["MASS_GATHERING"] = "MASS_GATHERING";
    TargetType["TRANSPORTATION"] = "TRANSPORTATION";
    TargetType["UTILITY"] = "UTILITY";
})(TargetType || (exports.TargetType = TargetType = {}));
var IndicatorType;
(function (IndicatorType) {
    IndicatorType["TARGET_SURVEILLANCE"] = "TARGET_SURVEILLANCE";
    IndicatorType["WEAPONS_PROCUREMENT"] = "WEAPONS_PROCUREMENT";
    IndicatorType["EXPLOSIVES_ACQUISITION"] = "EXPLOSIVES_ACQUISITION";
    IndicatorType["ATTACK_REHEARSAL"] = "ATTACK_REHEARSAL";
    IndicatorType["COMMUNICATION_PATTERN"] = "COMMUNICATION_PATTERN";
    IndicatorType["TRAVEL_PATTERN"] = "TRAVEL_PATTERN";
    IndicatorType["TRAINING_ACTIVITY"] = "TRAINING_ACTIVITY";
    IndicatorType["OPSEC_LAPSE"] = "OPSEC_LAPSE";
    IndicatorType["MARTYRDOM_VIDEO"] = "MARTYRDOM_VIDEO";
    IndicatorType["LAST_TESTAMENT"] = "LAST_TESTAMENT";
    IndicatorType["FUNDING_TRANSFER"] = "FUNDING_TRANSFER";
    IndicatorType["SAFEHOUSE_RENTAL"] = "SAFEHOUSE_RENTAL";
})(IndicatorType || (exports.IndicatorType = IndicatorType = {}));
var ThreatSeverity;
(function (ThreatSeverity) {
    ThreatSeverity["CRITICAL"] = "CRITICAL";
    ThreatSeverity["HIGH"] = "HIGH";
    ThreatSeverity["MEDIUM"] = "MEDIUM";
    ThreatSeverity["LOW"] = "LOW";
    ThreatSeverity["INFORMATIONAL"] = "INFORMATIONAL";
})(ThreatSeverity || (exports.ThreatSeverity = ThreatSeverity = {}));
var WeaponType;
(function (WeaponType) {
    WeaponType["SMALL_ARMS"] = "SMALL_ARMS";
    WeaponType["EXPLOSIVES"] = "EXPLOSIVES";
    WeaponType["IED_COMPONENTS"] = "IED_COMPONENTS";
    WeaponType["CHEMICAL"] = "CHEMICAL";
    WeaponType["BIOLOGICAL"] = "BIOLOGICAL";
    WeaponType["VEHICLE"] = "VEHICLE";
    WeaponType["DRONE"] = "DRONE";
    WeaponType["AMMUNITION"] = "AMMUNITION";
    WeaponType["DETONATORS"] = "DETONATORS";
})(WeaponType || (exports.WeaponType = WeaponType = {}));
var ExplosiveType;
(function (ExplosiveType) {
    ExplosiveType["COMMERCIAL"] = "COMMERCIAL";
    ExplosiveType["MILITARY"] = "MILITARY";
    ExplosiveType["HOMEMADE"] = "HOMEMADE";
    ExplosiveType["PRECURSOR_CHEMICAL"] = "PRECURSOR_CHEMICAL";
    ExplosiveType["FERTILIZER"] = "FERTILIZER";
    ExplosiveType["FUEL"] = "FUEL";
    ExplosiveType["INITIATOR"] = "INITIATOR";
})(ExplosiveType || (exports.ExplosiveType = ExplosiveType = {}));
var TrainingType;
(function (TrainingType) {
    TrainingType["WEAPONS"] = "WEAPONS";
    TrainingType["EXPLOSIVES"] = "EXPLOSIVES";
    TrainingType["TACTICS"] = "TACTICS";
    TrainingType["OPERATIONAL_SECURITY"] = "OPERATIONAL_SECURITY";
    TrainingType["SURVEILLANCE"] = "SURVEILLANCE";
    TrainingType["CYBER"] = "CYBER";
    TrainingType["MEDICAL"] = "MEDICAL";
    TrainingType["PHYSICAL"] = "PHYSICAL";
})(TrainingType || (exports.TrainingType = TrainingType = {}));
var CommunicationMedium;
(function (CommunicationMedium) {
    CommunicationMedium["PHONE"] = "PHONE";
    CommunicationMedium["EMAIL"] = "EMAIL";
    CommunicationMedium["MESSAGING_APP"] = "MESSAGING_APP";
    CommunicationMedium["SOCIAL_MEDIA"] = "SOCIAL_MEDIA";
    CommunicationMedium["FORUM"] = "FORUM";
    CommunicationMedium["ENCRYPTED_CHANNEL"] = "ENCRYPTED_CHANNEL";
    CommunicationMedium["IN_PERSON"] = "IN_PERSON";
    CommunicationMedium["COURIER"] = "COURIER";
})(CommunicationMedium || (exports.CommunicationMedium = CommunicationMedium = {}));

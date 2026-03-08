"use strict";
/**
 * Diplomatic Event Types and Tracking
 * Comprehensive types for tracking diplomatic activities, state visits, and international engagements
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DiplomaticLevel = exports.EventStatus = exports.DiplomaticEventType = void 0;
var DiplomaticEventType;
(function (DiplomaticEventType) {
    DiplomaticEventType["STATE_VISIT"] = "STATE_VISIT";
    DiplomaticEventType["OFFICIAL_VISIT"] = "OFFICIAL_VISIT";
    DiplomaticEventType["WORKING_VISIT"] = "WORKING_VISIT";
    DiplomaticEventType["SUMMIT"] = "SUMMIT";
    DiplomaticEventType["CONFERENCE"] = "CONFERENCE";
    DiplomaticEventType["BILATERAL_MEETING"] = "BILATERAL_MEETING";
    DiplomaticEventType["MULTILATERAL_MEETING"] = "MULTILATERAL_MEETING";
    DiplomaticEventType["NEGOTIATION_SESSION"] = "NEGOTIATION_SESSION";
    DiplomaticEventType["TREATY_SIGNING"] = "TREATY_SIGNING";
    DiplomaticEventType["DIPLOMATIC_APPOINTMENT"] = "DIPLOMATIC_APPOINTMENT";
    DiplomaticEventType["EMBASSY_EVENT"] = "EMBASSY_EVENT";
    DiplomaticEventType["CONSULATE_EVENT"] = "CONSULATE_EVENT";
    DiplomaticEventType["PROTOCOL_EVENT"] = "PROTOCOL_EVENT";
    DiplomaticEventType["CULTURAL_DIPLOMACY"] = "CULTURAL_DIPLOMACY";
    DiplomaticEventType["PUBLIC_DIPLOMACY"] = "PUBLIC_DIPLOMACY";
    DiplomaticEventType["TRACK_TWO_DIPLOMACY"] = "TRACK_TWO_DIPLOMACY";
    DiplomaticEventType["BACKCHANNEL_COMMUNICATION"] = "BACKCHANNEL_COMMUNICATION";
    DiplomaticEventType["DIPLOMATIC_RECEPTION"] = "DIPLOMATIC_RECEPTION";
    DiplomaticEventType["CREDENTIALS_PRESENTATION"] = "CREDENTIALS_PRESENTATION";
    DiplomaticEventType["RECALL_OR_EXPULSION"] = "RECALL_OR_EXPULSION";
})(DiplomaticEventType || (exports.DiplomaticEventType = DiplomaticEventType = {}));
var EventStatus;
(function (EventStatus) {
    EventStatus["SCHEDULED"] = "SCHEDULED";
    EventStatus["IN_PROGRESS"] = "IN_PROGRESS";
    EventStatus["COMPLETED"] = "COMPLETED";
    EventStatus["CANCELLED"] = "CANCELLED";
    EventStatus["POSTPONED"] = "POSTPONED";
    EventStatus["RUMORED"] = "RUMORED";
    EventStatus["CONFIRMED"] = "CONFIRMED";
})(EventStatus || (exports.EventStatus = EventStatus = {}));
var DiplomaticLevel;
(function (DiplomaticLevel) {
    DiplomaticLevel["HEAD_OF_STATE"] = "HEAD_OF_STATE";
    DiplomaticLevel["HEAD_OF_GOVERNMENT"] = "HEAD_OF_GOVERNMENT";
    DiplomaticLevel["FOREIGN_MINISTER"] = "FOREIGN_MINISTER";
    DiplomaticLevel["MINISTER"] = "MINISTER";
    DiplomaticLevel["AMBASSADOR"] = "AMBASSADOR";
    DiplomaticLevel["DEPUTY_MINISTER"] = "DEPUTY_MINISTER";
    DiplomaticLevel["SPECIAL_ENVOY"] = "SPECIAL_ENVOY";
    DiplomaticLevel["DIRECTOR_GENERAL"] = "DIRECTOR_GENERAL";
    DiplomaticLevel["SENIOR_OFFICIAL"] = "SENIOR_OFFICIAL";
    DiplomaticLevel["WORKING_LEVEL"] = "WORKING_LEVEL";
    DiplomaticLevel["NON_GOVERNMENTAL"] = "NON_GOVERNMENTAL";
})(DiplomaticLevel || (exports.DiplomaticLevel = DiplomaticLevel = {}));

"use strict";
/**
 * Diplomatic Communications Analysis Types
 * Comprehensive types for analyzing diplomatic communications, statements, cables, and messaging
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.Classification = exports.Urgency = exports.Sentiment = exports.Tone = exports.CommunicationType = void 0;
var CommunicationType;
(function (CommunicationType) {
    CommunicationType["DIPLOMATIC_CABLE"] = "DIPLOMATIC_CABLE";
    CommunicationType["OFFICIAL_STATEMENT"] = "OFFICIAL_STATEMENT";
    CommunicationType["PRESS_RELEASE"] = "PRESS_RELEASE";
    CommunicationType["SPEECH"] = "SPEECH";
    CommunicationType["JOINT_STATEMENT"] = "JOINT_STATEMENT";
    CommunicationType["COMMUNIQUE"] = "COMMUNIQUE";
    CommunicationType["DEMARCHE"] = "DEMARCHE";
    CommunicationType["NOTE_VERBALE"] = "NOTE_VERBALE";
    CommunicationType["AIDE_MEMOIRE"] = "AIDE_MEMOIRE";
    CommunicationType["MEMORANDUM"] = "MEMORANDUM";
    CommunicationType["PROTEST_NOTE"] = "PROTEST_NOTE";
    CommunicationType["DIPLOMATIC_NOTE"] = "DIPLOMATIC_NOTE";
    CommunicationType["TALKING_POINTS"] = "TALKING_POINTS";
    CommunicationType["READOUT"] = "READOUT";
    CommunicationType["BRIEFING"] = "BRIEFING";
    CommunicationType["INTERVIEW"] = "INTERVIEW";
    CommunicationType["SOCIAL_MEDIA"] = "SOCIAL_MEDIA";
})(CommunicationType || (exports.CommunicationType = CommunicationType = {}));
var Tone;
(function (Tone) {
    Tone["DIPLOMATIC"] = "DIPLOMATIC";
    Tone["CONCILIATORY"] = "CONCILIATORY";
    Tone["FRIENDLY"] = "FRIENDLY";
    Tone["NEUTRAL"] = "NEUTRAL";
    Tone["FIRM"] = "FIRM";
    Tone["STERN"] = "STERN";
    Tone["WARNING"] = "WARNING";
    Tone["THREATENING"] = "THREATENING";
    Tone["CONFRONTATIONAL"] = "CONFRONTATIONAL";
    Tone["APOLOGETIC"] = "APOLOGETIC";
    Tone["DEFENSIVE"] = "DEFENSIVE";
    Tone["CELEBRATORY"] = "CELEBRATORY";
})(Tone || (exports.Tone = Tone = {}));
var Sentiment;
(function (Sentiment) {
    Sentiment["VERY_POSITIVE"] = "VERY_POSITIVE";
    Sentiment["POSITIVE"] = "POSITIVE";
    Sentiment["SLIGHTLY_POSITIVE"] = "SLIGHTLY_POSITIVE";
    Sentiment["NEUTRAL"] = "NEUTRAL";
    Sentiment["SLIGHTLY_NEGATIVE"] = "SLIGHTLY_NEGATIVE";
    Sentiment["NEGATIVE"] = "NEGATIVE";
    Sentiment["VERY_NEGATIVE"] = "VERY_NEGATIVE";
})(Sentiment || (exports.Sentiment = Sentiment = {}));
var Urgency;
(function (Urgency) {
    Urgency["ROUTINE"] = "ROUTINE";
    Urgency["PRIORITY"] = "PRIORITY";
    Urgency["IMMEDIATE"] = "IMMEDIATE";
    Urgency["FLASH"] = "FLASH";
    Urgency["EMERGENCY"] = "EMERGENCY";
})(Urgency || (exports.Urgency = Urgency = {}));
var Classification;
(function (Classification) {
    Classification["UNCLASSIFIED"] = "UNCLASSIFIED";
    Classification["OFFICIAL_USE_ONLY"] = "OFFICIAL_USE_ONLY";
    Classification["CONFIDENTIAL"] = "CONFIDENTIAL";
    Classification["SECRET"] = "SECRET";
    Classification["TOP_SECRET"] = "TOP_SECRET";
    Classification["SENSITIVE"] = "SENSITIVE";
})(Classification || (exports.Classification = Classification = {}));

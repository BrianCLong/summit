"use strict";
/**
 * Radicalization Detection Types
 * Types for monitoring radicalization pathways and extremist content
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.EngagementLevel = exports.ContentType = exports.InterventionType = exports.InfluenceType = exports.IndicatorType = exports.PathwayType = exports.RadicalizationStage = exports.RadicalizationStatus = void 0;
var RadicalizationStatus;
(function (RadicalizationStatus) {
    RadicalizationStatus["MONITORING"] = "MONITORING";
    RadicalizationStatus["AT_RISK"] = "AT_RISK";
    RadicalizationStatus["RADICALIZED"] = "RADICALIZED";
    RadicalizationStatus["MOBILIZED"] = "MOBILIZED";
    RadicalizationStatus["DERADICALIZED"] = "DERADICALIZED";
})(RadicalizationStatus || (exports.RadicalizationStatus = RadicalizationStatus = {}));
var RadicalizationStage;
(function (RadicalizationStage) {
    RadicalizationStage["PRE_RADICALIZATION"] = "PRE_RADICALIZATION";
    RadicalizationStage["IDENTIFICATION"] = "IDENTIFICATION";
    RadicalizationStage["INDOCTRINATION"] = "INDOCTRINATION";
    RadicalizationStage["ACTION"] = "ACTION";
})(RadicalizationStage || (exports.RadicalizationStage = RadicalizationStage = {}));
var PathwayType;
(function (PathwayType) {
    PathwayType["ONLINE"] = "ONLINE";
    PathwayType["PEER_NETWORK"] = "PEER_NETWORK";
    PathwayType["FAMILY"] = "FAMILY";
    PathwayType["RELIGIOUS_INSTITUTION"] = "RELIGIOUS_INSTITUTION";
    PathwayType["PRISON"] = "PRISON";
    PathwayType["CONFLICT_ZONE"] = "CONFLICT_ZONE";
    PathwayType["IDEOLOGICAL_MENTOR"] = "IDEOLOGICAL_MENTOR";
    PathwayType["GRIEVANCE_BASED"] = "GRIEVANCE_BASED";
})(PathwayType || (exports.PathwayType = PathwayType = {}));
var IndicatorType;
(function (IndicatorType) {
    IndicatorType["CONTENT_CONSUMPTION"] = "CONTENT_CONSUMPTION";
    IndicatorType["IDEOLOGICAL_SHIFT"] = "IDEOLOGICAL_SHIFT";
    IndicatorType["BEHAVIORAL_CHANGE"] = "BEHAVIORAL_CHANGE";
    IndicatorType["SOCIAL_ISOLATION"] = "SOCIAL_ISOLATION";
    IndicatorType["EXTREMIST_ASSOCIATION"] = "EXTREMIST_ASSOCIATION";
    IndicatorType["VIOLENT_RHETORIC"] = "VIOLENT_RHETORIC";
    IndicatorType["MARTYRDOM_GLORIFICATION"] = "MARTYRDOM_GLORIFICATION";
    IndicatorType["CONSPIRACY_THEORIES"] = "CONSPIRACY_THEORIES";
    IndicatorType["US_VS_THEM"] = "US_VS_THEM";
    IndicatorType["DEHUMANIZATION"] = "DEHUMANIZATION";
})(IndicatorType || (exports.IndicatorType = IndicatorType = {}));
var InfluenceType;
(function (InfluenceType) {
    InfluenceType["IDEOLOGICAL_MENTOR"] = "IDEOLOGICAL_MENTOR";
    InfluenceType["PEER_GROUP"] = "PEER_GROUP";
    InfluenceType["ONLINE_COMMUNITY"] = "ONLINE_COMMUNITY";
    InfluenceType["FAMILY_MEMBER"] = "FAMILY_MEMBER";
    InfluenceType["RELIGIOUS_AUTHORITY"] = "RELIGIOUS_AUTHORITY";
    InfluenceType["EXTREMIST_CONTENT"] = "EXTREMIST_CONTENT";
    InfluenceType["TRAUMATIC_EVENT"] = "TRAUMATIC_EVENT";
    InfluenceType["DISCRIMINATION"] = "DISCRIMINATION";
})(InfluenceType || (exports.InfluenceType = InfluenceType = {}));
var InterventionType;
(function (InterventionType) {
    InterventionType["COUNSELING"] = "COUNSELING";
    InterventionType["FAMILY_ENGAGEMENT"] = "FAMILY_ENGAGEMENT";
    InterventionType["COMMUNITY_PROGRAM"] = "COMMUNITY_PROGRAM";
    InterventionType["EDUCATION"] = "EDUCATION";
    InterventionType["MENTORSHIP"] = "MENTORSHIP";
    InterventionType["VOCATIONAL_TRAINING"] = "VOCATIONAL_TRAINING";
    InterventionType["COUNTER_NARRATIVE"] = "COUNTER_NARRATIVE";
    InterventionType["LAW_ENFORCEMENT"] = "LAW_ENFORCEMENT";
})(InterventionType || (exports.InterventionType = InterventionType = {}));
var ContentType;
(function (ContentType) {
    ContentType["VIDEO"] = "VIDEO";
    ContentType["ARTICLE"] = "ARTICLE";
    ContentType["FORUM_POST"] = "FORUM_POST";
    ContentType["SOCIAL_MEDIA_POST"] = "SOCIAL_MEDIA_POST";
    ContentType["AUDIO"] = "AUDIO";
    ContentType["DOCUMENT"] = "DOCUMENT";
    ContentType["LIVESTREAM"] = "LIVESTREAM";
})(ContentType || (exports.ContentType = ContentType = {}));
var EngagementLevel;
(function (EngagementLevel) {
    EngagementLevel["VIEW"] = "VIEW";
    EngagementLevel["LIKE"] = "LIKE";
    EngagementLevel["SHARE"] = "SHARE";
    EngagementLevel["COMMENT"] = "COMMENT";
    EngagementLevel["CREATE"] = "CREATE";
})(EngagementLevel || (exports.EngagementLevel = EngagementLevel = {}));

"use strict";
/**
 * Signal Contracts Package
 *
 * Public API for the Signal Bus contract definitions.
 * This package defines the shared schemas, types, and utilities
 * used across the Signal Bus streaming pipeline.
 *
 * @packageDocumentation
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.AbsenceRuleSchema = exports.RateRuleSchema = exports.TemporalRuleSchema = exports.PatternRuleSchema = exports.ThresholdRuleSchema = exports.RuleBaseSchema = exports.ConditionSchema = exports.CompoundConditionSchema = exports.SimpleConditionSchema = exports.RuleStatus = exports.WindowType = exports.LogicalOperator = exports.ComparisonOperator = exports.calculateAlertPriority = exports.shouldSuppressAlert = exports.validateAlert = exports.createAlertFromSignal = exports.createAlert = exports.UpdateAlertInputSchema = exports.CreateAlertInputSchema = exports.AlertSchema = exports.AlertActionSchema = exports.AlertContextSchema = exports.TriggeringRuleSchema = exports.SignalReferenceSchema = exports.AlertType = exports.AlertStatus = exports.AlertSeverity = exports.getRoutingKey = exports.getPartitionKey = exports.validateSignalEnvelope = exports.addProvenanceStep = exports.createSignalEnvelope = exports.RawSignalInputSchema = exports.SignalEnvelopeSchema = exports.SignalMetadataSchema = exports.EnrichmentDataSchema = exports.ProvenanceSchema = exports.DeviceInfoSchema = exports.GeoLocationSchema = exports.SignalSourceSchema = exports.SignalQuality = exports.getSignalPriority = exports.requiresEnrichment = exports.getSignalTypesByCategory = exports.getSignalTypeDefinition = exports.SignalTypeIdSchema = exports.SignalTypeRegistry = exports.SignalTypeId = exports.SignalCategory = void 0;
exports.TopicHealthChecks = exports.getAllTopicConfigs = exports.getAllTopicNames = exports.isHighPriorityAlert = exports.getDownstreamTopic = exports.getAlertPartitionKey = exports.getSignalPartitionKey = exports.getCategoryTopic = exports.ConsumerGroups = exports.TopicConfigs = exports.SignalTopics = exports.TopicNamespace = exports.validateDownstreamEvent = exports.createCaseAlertNotification = exports.createCaseTaskFromAlert = exports.createSpacetimeEvent = exports.createGraphEntitySuggestion = exports.AnalyticsAggregationSchema = exports.AnalyticsMetricSchema = exports.CaseAlertNotificationSchema = exports.CaseWatchlistHitSchema = exports.CaseTaskSuggestedSchema = exports.SpacetimeTrackSchema = exports.SpacetimeEventSchema = exports.GraphEnrichmentSchema = exports.GraphRelationshipSuggestedSchema = exports.GraphEntitySuggestedSchema = exports.DownstreamEventBaseSchema = exports.DownstreamEventType = exports.sortRulesByPriority = exports.ruleAppliesToSignalType = exports.validateRule = exports.createAbsenceRule = exports.createRateRule = exports.createPatternRule = exports.createThresholdRule = exports.RuleEvaluationResultSchema = exports.RuleSchema = exports.CorrelationRuleSchema = exports.AnomalyRuleSchema = void 0;
// Signal Types
var signal_types_js_1 = require("./signal-types.js");
Object.defineProperty(exports, "SignalCategory", { enumerable: true, get: function () { return signal_types_js_1.SignalCategory; } });
Object.defineProperty(exports, "SignalTypeId", { enumerable: true, get: function () { return signal_types_js_1.SignalTypeId; } });
Object.defineProperty(exports, "SignalTypeRegistry", { enumerable: true, get: function () { return signal_types_js_1.SignalTypeRegistry; } });
Object.defineProperty(exports, "SignalTypeIdSchema", { enumerable: true, get: function () { return signal_types_js_1.SignalTypeIdSchema; } });
Object.defineProperty(exports, "getSignalTypeDefinition", { enumerable: true, get: function () { return signal_types_js_1.getSignalTypeDefinition; } });
Object.defineProperty(exports, "getSignalTypesByCategory", { enumerable: true, get: function () { return signal_types_js_1.getSignalTypesByCategory; } });
Object.defineProperty(exports, "requiresEnrichment", { enumerable: true, get: function () { return signal_types_js_1.requiresEnrichment; } });
Object.defineProperty(exports, "getSignalPriority", { enumerable: true, get: function () { return signal_types_js_1.getSignalPriority; } });
// Signal Envelope
var signal_envelope_js_1 = require("./signal-envelope.js");
Object.defineProperty(exports, "SignalQuality", { enumerable: true, get: function () { return signal_envelope_js_1.SignalQuality; } });
Object.defineProperty(exports, "SignalSourceSchema", { enumerable: true, get: function () { return signal_envelope_js_1.SignalSourceSchema; } });
Object.defineProperty(exports, "GeoLocationSchema", { enumerable: true, get: function () { return signal_envelope_js_1.GeoLocationSchema; } });
Object.defineProperty(exports, "DeviceInfoSchema", { enumerable: true, get: function () { return signal_envelope_js_1.DeviceInfoSchema; } });
Object.defineProperty(exports, "ProvenanceSchema", { enumerable: true, get: function () { return signal_envelope_js_1.ProvenanceSchema; } });
Object.defineProperty(exports, "EnrichmentDataSchema", { enumerable: true, get: function () { return signal_envelope_js_1.EnrichmentDataSchema; } });
Object.defineProperty(exports, "SignalMetadataSchema", { enumerable: true, get: function () { return signal_envelope_js_1.SignalMetadataSchema; } });
Object.defineProperty(exports, "SignalEnvelopeSchema", { enumerable: true, get: function () { return signal_envelope_js_1.SignalEnvelopeSchema; } });
Object.defineProperty(exports, "RawSignalInputSchema", { enumerable: true, get: function () { return signal_envelope_js_1.RawSignalInputSchema; } });
Object.defineProperty(exports, "createSignalEnvelope", { enumerable: true, get: function () { return signal_envelope_js_1.createSignalEnvelope; } });
Object.defineProperty(exports, "addProvenanceStep", { enumerable: true, get: function () { return signal_envelope_js_1.addProvenanceStep; } });
Object.defineProperty(exports, "validateSignalEnvelope", { enumerable: true, get: function () { return signal_envelope_js_1.validateSignalEnvelope; } });
Object.defineProperty(exports, "getPartitionKey", { enumerable: true, get: function () { return signal_envelope_js_1.getPartitionKey; } });
Object.defineProperty(exports, "getRoutingKey", { enumerable: true, get: function () { return signal_envelope_js_1.getRoutingKey; } });
// Alerts
var alert_js_1 = require("./alert.js");
Object.defineProperty(exports, "AlertSeverity", { enumerable: true, get: function () { return alert_js_1.AlertSeverity; } });
Object.defineProperty(exports, "AlertStatus", { enumerable: true, get: function () { return alert_js_1.AlertStatus; } });
Object.defineProperty(exports, "AlertType", { enumerable: true, get: function () { return alert_js_1.AlertType; } });
Object.defineProperty(exports, "SignalReferenceSchema", { enumerable: true, get: function () { return alert_js_1.SignalReferenceSchema; } });
Object.defineProperty(exports, "TriggeringRuleSchema", { enumerable: true, get: function () { return alert_js_1.TriggeringRuleSchema; } });
Object.defineProperty(exports, "AlertContextSchema", { enumerable: true, get: function () { return alert_js_1.AlertContextSchema; } });
Object.defineProperty(exports, "AlertActionSchema", { enumerable: true, get: function () { return alert_js_1.AlertActionSchema; } });
Object.defineProperty(exports, "AlertSchema", { enumerable: true, get: function () { return alert_js_1.AlertSchema; } });
Object.defineProperty(exports, "CreateAlertInputSchema", { enumerable: true, get: function () { return alert_js_1.CreateAlertInputSchema; } });
Object.defineProperty(exports, "UpdateAlertInputSchema", { enumerable: true, get: function () { return alert_js_1.UpdateAlertInputSchema; } });
Object.defineProperty(exports, "createAlert", { enumerable: true, get: function () { return alert_js_1.createAlert; } });
Object.defineProperty(exports, "createAlertFromSignal", { enumerable: true, get: function () { return alert_js_1.createAlertFromSignal; } });
Object.defineProperty(exports, "validateAlert", { enumerable: true, get: function () { return alert_js_1.validateAlert; } });
Object.defineProperty(exports, "shouldSuppressAlert", { enumerable: true, get: function () { return alert_js_1.shouldSuppressAlert; } });
Object.defineProperty(exports, "calculateAlertPriority", { enumerable: true, get: function () { return alert_js_1.calculateAlertPriority; } });
// Rules
var rules_js_1 = require("./rules.js");
Object.defineProperty(exports, "ComparisonOperator", { enumerable: true, get: function () { return rules_js_1.ComparisonOperator; } });
Object.defineProperty(exports, "LogicalOperator", { enumerable: true, get: function () { return rules_js_1.LogicalOperator; } });
Object.defineProperty(exports, "WindowType", { enumerable: true, get: function () { return rules_js_1.WindowType; } });
Object.defineProperty(exports, "RuleStatus", { enumerable: true, get: function () { return rules_js_1.RuleStatus; } });
Object.defineProperty(exports, "SimpleConditionSchema", { enumerable: true, get: function () { return rules_js_1.SimpleConditionSchema; } });
Object.defineProperty(exports, "CompoundConditionSchema", { enumerable: true, get: function () { return rules_js_1.CompoundConditionSchema; } });
Object.defineProperty(exports, "ConditionSchema", { enumerable: true, get: function () { return rules_js_1.ConditionSchema; } });
Object.defineProperty(exports, "RuleBaseSchema", { enumerable: true, get: function () { return rules_js_1.RuleBaseSchema; } });
Object.defineProperty(exports, "ThresholdRuleSchema", { enumerable: true, get: function () { return rules_js_1.ThresholdRuleSchema; } });
Object.defineProperty(exports, "PatternRuleSchema", { enumerable: true, get: function () { return rules_js_1.PatternRuleSchema; } });
Object.defineProperty(exports, "TemporalRuleSchema", { enumerable: true, get: function () { return rules_js_1.TemporalRuleSchema; } });
Object.defineProperty(exports, "RateRuleSchema", { enumerable: true, get: function () { return rules_js_1.RateRuleSchema; } });
Object.defineProperty(exports, "AbsenceRuleSchema", { enumerable: true, get: function () { return rules_js_1.AbsenceRuleSchema; } });
Object.defineProperty(exports, "AnomalyRuleSchema", { enumerable: true, get: function () { return rules_js_1.AnomalyRuleSchema; } });
Object.defineProperty(exports, "CorrelationRuleSchema", { enumerable: true, get: function () { return rules_js_1.CorrelationRuleSchema; } });
Object.defineProperty(exports, "RuleSchema", { enumerable: true, get: function () { return rules_js_1.RuleSchema; } });
Object.defineProperty(exports, "RuleEvaluationResultSchema", { enumerable: true, get: function () { return rules_js_1.RuleEvaluationResultSchema; } });
Object.defineProperty(exports, "createThresholdRule", { enumerable: true, get: function () { return rules_js_1.createThresholdRule; } });
Object.defineProperty(exports, "createPatternRule", { enumerable: true, get: function () { return rules_js_1.createPatternRule; } });
Object.defineProperty(exports, "createRateRule", { enumerable: true, get: function () { return rules_js_1.createRateRule; } });
Object.defineProperty(exports, "createAbsenceRule", { enumerable: true, get: function () { return rules_js_1.createAbsenceRule; } });
Object.defineProperty(exports, "validateRule", { enumerable: true, get: function () { return rules_js_1.validateRule; } });
Object.defineProperty(exports, "ruleAppliesToSignalType", { enumerable: true, get: function () { return rules_js_1.ruleAppliesToSignalType; } });
Object.defineProperty(exports, "sortRulesByPriority", { enumerable: true, get: function () { return rules_js_1.sortRulesByPriority; } });
// Downstream Integration
var downstream_js_1 = require("./downstream.js");
Object.defineProperty(exports, "DownstreamEventType", { enumerable: true, get: function () { return downstream_js_1.DownstreamEventType; } });
Object.defineProperty(exports, "DownstreamEventBaseSchema", { enumerable: true, get: function () { return downstream_js_1.DownstreamEventBaseSchema; } });
Object.defineProperty(exports, "GraphEntitySuggestedSchema", { enumerable: true, get: function () { return downstream_js_1.GraphEntitySuggestedSchema; } });
Object.defineProperty(exports, "GraphRelationshipSuggestedSchema", { enumerable: true, get: function () { return downstream_js_1.GraphRelationshipSuggestedSchema; } });
Object.defineProperty(exports, "GraphEnrichmentSchema", { enumerable: true, get: function () { return downstream_js_1.GraphEnrichmentSchema; } });
Object.defineProperty(exports, "SpacetimeEventSchema", { enumerable: true, get: function () { return downstream_js_1.SpacetimeEventSchema; } });
Object.defineProperty(exports, "SpacetimeTrackSchema", { enumerable: true, get: function () { return downstream_js_1.SpacetimeTrackSchema; } });
Object.defineProperty(exports, "CaseTaskSuggestedSchema", { enumerable: true, get: function () { return downstream_js_1.CaseTaskSuggestedSchema; } });
Object.defineProperty(exports, "CaseWatchlistHitSchema", { enumerable: true, get: function () { return downstream_js_1.CaseWatchlistHitSchema; } });
Object.defineProperty(exports, "CaseAlertNotificationSchema", { enumerable: true, get: function () { return downstream_js_1.CaseAlertNotificationSchema; } });
Object.defineProperty(exports, "AnalyticsMetricSchema", { enumerable: true, get: function () { return downstream_js_1.AnalyticsMetricSchema; } });
Object.defineProperty(exports, "AnalyticsAggregationSchema", { enumerable: true, get: function () { return downstream_js_1.AnalyticsAggregationSchema; } });
Object.defineProperty(exports, "createGraphEntitySuggestion", { enumerable: true, get: function () { return downstream_js_1.createGraphEntitySuggestion; } });
Object.defineProperty(exports, "createSpacetimeEvent", { enumerable: true, get: function () { return downstream_js_1.createSpacetimeEvent; } });
Object.defineProperty(exports, "createCaseTaskFromAlert", { enumerable: true, get: function () { return downstream_js_1.createCaseTaskFromAlert; } });
Object.defineProperty(exports, "createCaseAlertNotification", { enumerable: true, get: function () { return downstream_js_1.createCaseAlertNotification; } });
Object.defineProperty(exports, "validateDownstreamEvent", { enumerable: true, get: function () { return downstream_js_1.validateDownstreamEvent; } });
// Topics
var topics_js_1 = require("./topics.js");
Object.defineProperty(exports, "TopicNamespace", { enumerable: true, get: function () { return topics_js_1.TopicNamespace; } });
Object.defineProperty(exports, "SignalTopics", { enumerable: true, get: function () { return topics_js_1.SignalTopics; } });
Object.defineProperty(exports, "TopicConfigs", { enumerable: true, get: function () { return topics_js_1.TopicConfigs; } });
Object.defineProperty(exports, "ConsumerGroups", { enumerable: true, get: function () { return topics_js_1.ConsumerGroups; } });
Object.defineProperty(exports, "getCategoryTopic", { enumerable: true, get: function () { return topics_js_1.getCategoryTopic; } });
Object.defineProperty(exports, "getSignalPartitionKey", { enumerable: true, get: function () { return topics_js_1.getSignalPartitionKey; } });
Object.defineProperty(exports, "getAlertPartitionKey", { enumerable: true, get: function () { return topics_js_1.getAlertPartitionKey; } });
Object.defineProperty(exports, "getDownstreamTopic", { enumerable: true, get: function () { return topics_js_1.getDownstreamTopic; } });
Object.defineProperty(exports, "isHighPriorityAlert", { enumerable: true, get: function () { return topics_js_1.isHighPriorityAlert; } });
Object.defineProperty(exports, "getAllTopicNames", { enumerable: true, get: function () { return topics_js_1.getAllTopicNames; } });
Object.defineProperty(exports, "getAllTopicConfigs", { enumerable: true, get: function () { return topics_js_1.getAllTopicConfigs; } });
Object.defineProperty(exports, "TopicHealthChecks", { enumerable: true, get: function () { return topics_js_1.TopicHealthChecks; } });

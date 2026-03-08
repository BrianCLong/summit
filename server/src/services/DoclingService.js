"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.doclingService = void 0;
const axios_1 = __importDefault(require("axios"));
const crypto_1 = require("crypto");
// @ts-ignore - env.ts is currently empty/placeholder
const env_js_1 = require("../config/env.js");
const metrics_js_1 = require("../monitoring/metrics.js");
const doclingRepository_js_1 = require("../db/repositories/doclingRepository.js");
const doclingGraphRepository_js_1 = require("../db/repositories/doclingGraphRepository.js");
const TenantCostService_js_1 = require("./TenantCostService.js");
const ledger_js_1 = require("../provenance/ledger.js");
const tracing_js_1 = require("../observability/tracing.js");
class DoclingService {
    http;
    constructor() {
        this.http = axios_1.default.create({
            baseURL: env_js_1.env.DOCLING_SVC_URL,
            timeout: env_js_1.env.DOCLING_SVC_TIMEOUT_MS,
        });
    }
    async summarizeBuildFailure(input) {
        return tracing_js_1.tracer.trace("docling.summarize", async (span) => {
            const requestId = input.requestId || (0, crypto_1.randomUUID)();
            const parsePayload = {
                requestId,
                tenantId: input.tenantId,
                purpose: input.purpose,
                retention: input.retention,
                contentType: "text/plain",
                bytes: Buffer.from(input.logText).toString("base64"),
                hints: ["build-log", input.buildId],
            };
            let parseResponse;
            let parseFallback = false;
            try {
                parseResponse = await this.callDocling("parse", "/v1/parse", parsePayload);
            }
            catch (error) {
                parseResponse = this.baselineParse(input.tenantId, requestId, input.logText, input.purpose, input.retention);
                parseFallback = true;
            }
            const storedFragments = await doclingRepository_js_1.doclingRepository.saveFragments(input.tenantId, requestId, "BUILD_LOG", parseResponse.result.fragments.map((fragment) => ({
                id: fragment.id,
                sha256: fragment.sha256,
                contentType: fragment.mimeType,
                text: fragment.text,
                metadata: fragment.metadata,
            })), input.artifactUri);
            await doclingGraphRepository_js_1.doclingGraphRepository.mergeFragments(storedFragments.map((fragment) => ({
                id: fragment.id,
                sha256: fragment.sha256,
                sourceType: "BUILD_LOG",
                requestId,
                tenantId: input.tenantId,
                text: fragment.text,
                sourceUri: fragment.sourceUri,
            })), { tenantId: input.tenantId, buildId: input.buildId });
            const summaryPayload = {
                requestId,
                tenantId: input.tenantId,
                purpose: input.purpose,
                retention: input.retention,
                text: input.logText,
                focus: "failures",
                maxTokens: input.maxTokens ?? 512,
                relatedFragmentIds: storedFragments.slice(0, 5).map((fragment) => fragment.id),
            };
            let summaryResponse;
            let summaryFallback = false;
            try {
                summaryResponse = await this.callDocling("summarize", "/v1/summarize", summaryPayload);
            }
            catch (error) {
                summaryResponse = this.baselineSummary(input.tenantId, requestId, input.logText, input.purpose, input.retention);
                summaryFallback = true;
            }
            const summaryRecord = await doclingRepository_js_1.doclingRepository.saveSummary(input.tenantId, requestId, "BUILD", summaryResponse.result.focus, summaryResponse.result.text, summaryResponse.result.highlights, summaryResponse.result.qualitySignals);
            await doclingGraphRepository_js_1.doclingGraphRepository.mergeSummary({
                id: summaryRecord.id,
                tenantId: input.tenantId,
                requestId,
                scope: "BUILD",
                focus: summaryResponse.result.focus,
                text: summaryResponse.result.text,
            }, { buildId: input.buildId, tenantId: input.tenantId });
            const findingRecords = await doclingRepository_js_1.doclingRepository.saveFindings(input.tenantId, requestId, parseResponse.result.fragments
                .filter((fragment) => fragment.metadata?.finding)
                .map((fragment) => ({
                fragmentId: fragment.id,
                label: fragment.metadata?.finding?.label || "finding",
                value: String(fragment.metadata?.finding?.value ?? ""),
                confidence: Number(fragment.metadata?.finding?.confidence ?? 0.5),
                severity: fragment.metadata?.finding?.severity,
                metadata: fragment.metadata || {},
            })));
            const findings = findingRecords.map((record) => ({
                id: record.id,
                fragmentId: record.fragmentId ?? undefined,
                label: record.label,
                value: record.value,
                confidence: record.confidence ?? 0,
                severity: (record.severity ?? undefined),
                metadata: record.metadata || {},
                qualitySignals: record.metadata?.qualitySignals ?? {},
            }));
            const traceLinks = storedFragments.slice(0, 3).map((fragment) => ({
                fragmentId: fragment.id,
                targetType: "Build",
                targetId: input.buildId,
                relation: "EVIDENCES",
                score: 0.8,
            }));
            await doclingRepository_js_1.doclingRepository.saveTraceLinks(input.tenantId, requestId, traceLinks);
            await doclingGraphRepository_js_1.doclingGraphRepository.linkTrace(requestId, input.tenantId, traceLinks);
            const policySignalRecords = await doclingRepository_js_1.doclingRepository.savePolicySignals(input.tenantId, requestId, summaryResponse.policySignals.map((signal) => ({
                classification: signal.classification,
                value: signal.value,
                purpose: signal.purpose,
                retention: signal.retention,
                fragmentId: signal.fragmentId,
                metadata: { qualitySignals: signal.qualitySignals },
            })));
            const policySignals = policySignalRecords.map((record) => ({
                id: record.id,
                classification: record.classification,
                value: record.value,
                purpose: record.purpose,
                retention: record.retention,
                fragmentId: record.fragmentId ?? undefined,
                metadata: record.metadata || {},
                qualitySignals: record.metadata?.qualitySignals ?? undefined,
            }));
            if (parseFallback) {
                this.recordUsageMetrics("parseFallback", input.tenantId, parseResponse.usage);
            }
            if (summaryFallback) {
                this.recordUsageMetrics("summarizeBuildFailureFallback", input.tenantId, summaryResponse.usage);
            }
            ledger_js_1.provenanceLedger.appendEntry({
                tenantId: input.tenantId,
                actionType: "docling_summarize_build_failure",
                resourceType: "build",
                resourceId: input.buildId,
                actorId: "docling-service",
                actorType: "system",
                timestamp: new Date(),
                payload: {
                    requestId,
                    fragments: storedFragments.length,
                    highlights: summaryResponse.result.highlights,
                    usage: summaryResponse.usage,
                },
                metadata: {
                    purpose: input.purpose,
                    retention: input.retention,
                },
            });
            return {
                summary: summaryResponse.result,
                fragments: parseResponse.result.fragments,
                findings,
                policySignals,
            };
        });
    }
    async extractLicenses(input) {
        return tracing_js_1.tracer.trace("docling.extract_licenses", async (span) => {
            const requestId = input.requestId || (0, crypto_1.randomUUID)();
            const payload = {
                requestId,
                tenantId: input.tenantId,
                purpose: input.purpose,
                retention: input.retention,
                text: input.text,
                targets: ["license", "version", "cve", "owner"],
            };
            let response;
            let fallback = false;
            try {
                response = await this.callDocling("extract", "/v1/extract", payload);
            }
            catch (error) {
                response = this.baselineExtract(input.tenantId, requestId, input.text, input.purpose, input.retention);
                fallback = true;
            }
            const findingRecords = await doclingRepository_js_1.doclingRepository.saveFindings(input.tenantId, requestId, response.result.findings.map((finding) => ({
                fragmentId: finding.fragmentId,
                label: finding.label,
                value: finding.value,
                confidence: finding.confidence,
                severity: finding.severity,
                metadata: {
                    qualitySignals: finding.qualitySignals,
                },
            })));
            const findings = findingRecords.map((record) => ({
                id: record.id,
                fragmentId: record.fragmentId ?? undefined,
                label: record.label,
                value: record.value,
                confidence: record.confidence ?? 0,
                severity: (record.severity ?? undefined),
                metadata: record.metadata || {},
                qualitySignals: record.metadata?.qualitySignals ?? {},
            }));
            const policySignalRecords = await doclingRepository_js_1.doclingRepository.savePolicySignals(input.tenantId, requestId, response.policySignals.map((signal) => ({
                classification: signal.classification,
                value: signal.value,
                purpose: signal.purpose,
                retention: signal.retention,
                fragmentId: signal.fragmentId,
                metadata: { qualitySignals: signal.qualitySignals },
            })));
            const policySignals = policySignalRecords.map((record) => ({
                id: record.id,
                classification: record.classification,
                value: record.value,
                purpose: record.purpose,
                retention: record.retention,
                fragmentId: record.fragmentId ?? undefined,
                metadata: record.metadata || {},
                qualitySignals: record.metadata?.qualitySignals ?? undefined,
            }));
            if (fallback) {
                this.recordUsageMetrics("extractLicensesFallback", input.tenantId, response.usage);
            }
            ledger_js_1.provenanceLedger.appendEntry({
                tenantId: input.tenantId,
                actionType: "docling_extract_licenses",
                resourceType: "artifact",
                resourceId: requestId,
                actorId: "docling-service",
                actorType: "system",
                timestamp: new Date(),
                payload: {
                    findings: findings.length,
                    usage: response.usage,
                },
                metadata: {
                    sourceType: input.sourceType,
                    purpose: input.purpose,
                },
            });
            return {
                findings,
                policySignals,
            };
        });
    }
    async generateReleaseNotes(input) {
        return tracing_js_1.tracer.trace("docling.release_notes", async (span) => {
            const requestId = input.requestId || (0, crypto_1.randomUUID)();
            const payload = {
                requestId,
                tenantId: input.tenantId,
                purpose: input.purpose,
                retention: input.retention,
                text: input.diffText,
                focus: "changelog",
                maxTokens: 400,
            };
            let response;
            let fallback = false;
            try {
                response = await this.callDocling("summarize", "/v1/summarize", payload);
            }
            catch (error) {
                response = this.baselineSummary(input.tenantId, requestId, input.diffText, input.purpose, input.retention, "changelog");
                fallback = true;
            }
            await doclingRepository_js_1.doclingRepository.saveSummary(input.tenantId, requestId, "RELEASE", response.result.focus, response.result.text, response.result.highlights, response.result.qualitySignals);
            if (fallback) {
                this.recordUsageMetrics("generateReleaseNotesFallback", input.tenantId, response.usage);
            }
            return {
                summary: response.result,
            };
        });
    }
    async callDocling(operation, path, payload) {
        const endTimer = metrics_js_1.doclingInferenceDuration.startTimer({
            operation,
            tenant_id: payload.tenantId,
        });
        try {
            const { data } = await this.http.post(path, payload);
            endTimer();
            metrics_js_1.doclingInferenceTotal.labels(operation, "success").inc();
            const usage = data.usage;
            if (usage) {
                metrics_js_1.doclingCharactersProcessed
                    .labels(payload.tenantId, operation)
                    .inc(usage.characters || 0);
                metrics_js_1.doclingCostUsd.labels(payload.tenantId).inc(usage.costUsd || 0);
                TenantCostService_js_1.tenantCostService.recordDoclingCost(payload.tenantId, usage.costUsd || 0, {
                    requestId: data.requestId,
                    operation,
                });
            }
            return data;
        }
        catch (error) {
            endTimer();
            metrics_js_1.doclingInferenceTotal.labels(operation, "error").inc();
            throw error;
        }
    }
    recordUsageMetrics(operation, tenantId, usage) {
        metrics_js_1.doclingCharactersProcessed.labels(tenantId, operation).inc(usage.characters || 0);
        metrics_js_1.doclingCostUsd.labels(tenantId).inc(usage.costUsd || 0);
    }
    baselineParse(tenantId, requestId, text, purpose, retention) {
        const fragments = text
            .split(/\n{2,}/)
            .slice(0, 10)
            .map((chunk, index) => ({
            id: `${requestId}-fragment-${index}`,
            sha256: (0, crypto_1.createHash)("sha256").update(chunk).digest("hex"),
            text: chunk,
            mimeType: "text/plain",
            metadata: { heuristic: true },
        }));
        return {
            requestId,
            tenantId,
            purpose,
            retention,
            result: { fragments },
            usage: {
                characters: text.length,
                costUsd: 0,
                latencyMs: 5,
            },
            policySignals: [],
        };
    }
    baselineSummary(tenantId, requestId, text, purpose, retention, focus = "failures") {
        const lines = text.split("\n").filter(Boolean);
        const failures = lines.filter((line) => /error|fail/i.test(line)).slice(0, 3);
        const summaryText = failures.length
            ? `Heuristic ${focus} summary: ${failures.join(" ")}`
            : `Heuristic ${focus} summary: No explicit failure lines found.`;
        return {
            requestId,
            tenantId,
            purpose,
            retention,
            result: {
                id: requestId,
                text: summaryText,
                focus,
                highlights: failures,
                qualitySignals: { heuristic: true },
            },
            usage: {
                characters: text.length,
                costUsd: 0,
                latencyMs: 4,
            },
            policySignals: [],
        };
    }
    baselineExtract(tenantId, requestId, text, purpose, retention) {
        const licenseMatch = text.match(/license[:\s]+([A-Za-z0-9\-\.]+)/i);
        const findings = licenseMatch
            ? [
                {
                    id: `${requestId}-license`,
                    label: "license",
                    value: licenseMatch[1],
                    confidence: 0.6,
                    qualitySignals: { heuristic: true },
                },
            ]
            : [];
        return {
            requestId,
            tenantId,
            purpose,
            retention,
            result: { findings },
            usage: {
                characters: text.length,
                costUsd: 0,
                latencyMs: 3,
            },
            policySignals: [],
        };
    }
}
exports.doclingService = new DoclingService();

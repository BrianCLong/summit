import axios from 'axios';
import { randomUUID, createHash } from 'crypto';
// @ts-ignore - env.ts is currently empty/placeholder
import { env } from '../config/env.js';
import {
  doclingInferenceDuration,
  doclingInferenceTotal,
  doclingCharactersProcessed,
  doclingCostUsd,
} from '../monitoring/metrics.js';
import { doclingRepository } from '../db/repositories/doclingRepository.js';
import { doclingGraphRepository } from '../db/repositories/doclingGraphRepository.js';
import { tenantCostService } from './TenantCostService.js';
import { provenanceLedger } from '../provenance/ledger.js';
import type {
  DoclingBaseResponse,
  SummarizeBuildFailureInput,
  SummarizeBuildFailureResult,
  ExtractLicensesInput,
  ExtractLicensesResult,
  ReleaseNotesInput,
  ReleaseNotesResult,
  DocFragment,
  DocSummary,
  DocFinding,
} from '../types/docling.js';

interface DoclingCallOptions {
  operation: 'parse' | 'summarize' | 'extract';
}

class DoclingService {
  private http: ReturnType<typeof axios.create>;

  constructor() {
    this.http = axios.create({
      baseURL: env.DOCLING_SVC_URL,
      timeout: parseInt(env.DOCLING_SVC_TIMEOUT_MS, 10),
    });
  }

  async summarizeBuildFailure(
    input: SummarizeBuildFailureInput,
  ): Promise<SummarizeBuildFailureResult> {
    const requestId = input.requestId || randomUUID();
    const parsePayload = {
      requestId,
      tenantId: input.tenantId,
      purpose: input.purpose,
      retention: input.retention,
      contentType: 'text/plain',
      bytes: Buffer.from(input.logText).toString('base64'),
      hints: ['build-log', input.buildId],
    };

    let parseResponse: DoclingBaseResponse<{ fragments: DocFragment[] }>;
    let parseFallback = false;
    try {
      parseResponse = await this.callDocling<{ fragments: DocFragment[] }>(
        'parse',
        '/v1/parse',
        parsePayload,
      );
    } catch (error) {
      parseResponse = this.baselineParse(
        input.tenantId,
        requestId,
        input.logText,
        input.purpose,
        input.retention,
      );
      parseFallback = true;
    }

    const storedFragments = await doclingRepository.saveFragments(
      input.tenantId,
      requestId,
      'BUILD_LOG',
      parseResponse.result.fragments.map((fragment) => ({
        id: fragment.id,
        sha256: fragment.sha256,
        contentType: fragment.mimeType,
        text: fragment.text,
        metadata: fragment.metadata,
      })),
      input.artifactUri,
    );

    await doclingGraphRepository.mergeFragments(
      storedFragments.map((fragment) => ({
        id: fragment.id,
        sha256: fragment.sha256,
        sourceType: 'BUILD_LOG',
        requestId,
        tenantId: input.tenantId,
        text: fragment.text,
        sourceUri: fragment.sourceUri,
      })),
      { tenantId: input.tenantId, buildId: input.buildId },
    );

    const summaryPayload = {
      requestId,
      tenantId: input.tenantId,
      purpose: input.purpose,
      retention: input.retention,
      text: input.logText,
      focus: 'failures' as const,
      maxTokens: input.maxTokens ?? 512,
      relatedFragmentIds: storedFragments
        .slice(0, 5)
        .map((fragment) => fragment.id),
    };

    let summaryResponse: DoclingBaseResponse<DocSummary>;
    let summaryFallback = false;
    try {
      summaryResponse = await this.callDocling<DocSummary>(
        'summarize',
        '/v1/summarize',
        summaryPayload,
      );
    } catch (error) {
      summaryResponse = this.baselineSummary(
        input.tenantId,
        requestId,
        input.logText,
        input.purpose,
        input.retention,
      );
      summaryFallback = true;
    }

    const summaryRecord = await doclingRepository.saveSummary(
      input.tenantId,
      requestId,
      'BUILD',
      summaryResponse.result.focus,
      summaryResponse.result.text,
      summaryResponse.result.highlights,
      summaryResponse.result.qualitySignals,
    );

    await doclingGraphRepository.mergeSummary(
      {
        id: summaryRecord.id,
        tenantId: input.tenantId,
        requestId,
        scope: 'BUILD',
        focus: summaryResponse.result.focus,
        text: summaryResponse.result.text,
      },
      { buildId: input.buildId, tenantId: input.tenantId },
    );

    const findingRecords = await doclingRepository.saveFindings(
      input.tenantId,
      requestId,
      parseResponse.result.fragments
        .filter((fragment) => fragment.metadata?.finding)
        .map((fragment) => ({
          fragmentId: fragment.id,
          label: fragment.metadata?.finding?.label || 'finding',
          value: String(fragment.metadata?.finding?.value ?? ''),
          confidence: Number(fragment.metadata?.finding?.confidence ?? 0.5),
          severity: fragment.metadata?.finding?.severity,
          metadata: fragment.metadata || {},
        })),
    );

    const findings: DocFinding[] = findingRecords.map((record) => ({
      id: record.id,
      fragmentId: record.fragmentId ?? undefined,
      label: record.label,
      value: record.value,
      confidence: record.confidence ?? 0,
      severity: (record.severity ?? undefined) as
        | DocFinding['severity']
        | undefined,
      metadata: record.metadata || {},
      qualitySignals:
        (record.metadata?.qualitySignals as
          | Record<string, unknown>
          | undefined) ?? {},
    }));

    const traceLinks = storedFragments.slice(0, 3).map((fragment) => ({
      fragmentId: fragment.id,
      targetType: 'Build',
      targetId: input.buildId,
      relation: 'EVIDENCES',
      score: 0.8,
    }));
    await doclingRepository.saveTraceLinks(
      input.tenantId,
      requestId,
      traceLinks,
    );
    await doclingGraphRepository.linkTrace(
      requestId,
      input.tenantId,
      traceLinks,
    );

    const policySignalRecords = await doclingRepository.savePolicySignals(
      input.tenantId,
      requestId,
      summaryResponse.policySignals.map((signal) => ({
        classification: signal.classification,
        value: signal.value,
        purpose: signal.purpose,
        retention: signal.retention,
        fragmentId: signal.fragmentId,
        metadata: { qualitySignals: signal.qualitySignals },
      })),
    );

    const policySignals = policySignalRecords.map((record) => ({
      id: record.id,
      classification: record.classification,
      value: record.value,
      purpose: record.purpose,
      retention: record.retention,
      fragmentId: record.fragmentId ?? undefined,
      metadata: record.metadata || {},
      qualitySignals:
        (record.metadata?.qualitySignals as
          | Record<string, number>
          | undefined) ?? undefined,
    }));

    if (parseFallback) {
      this.recordUsageMetrics(
        'parseFallback',
        input.tenantId,
        parseResponse.usage,
      );
    }
    if (summaryFallback) {
      this.recordUsageMetrics(
        'summarizeBuildFailureFallback',
        input.tenantId,
        summaryResponse.usage,
      );
    }

    provenanceLedger.appendEntry({
      tenantId: input.tenantId,
      actionType: 'docling_summarize_build_failure',
      resourceType: 'build',
      resourceId: input.buildId,
      actorId: 'docling-service',
      actorType: 'system',
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
    } as any);

    return {
      summary: summaryResponse.result,
      fragments: parseResponse.result.fragments,
      findings,
      policySignals,
    };
  }

  async extractLicenses(
    input: ExtractLicensesInput,
  ): Promise<ExtractLicensesResult> {
    const requestId = input.requestId || randomUUID();
    const payload = {
      requestId,
      tenantId: input.tenantId,
      purpose: input.purpose,
      retention: input.retention,
      text: input.text,
      targets: ['license', 'version', 'cve', 'owner'],
    };

    let response: DoclingBaseResponse<{ findings: DocFinding[] }>;
    let fallback = false;
    try {
      response = await this.callDocling<{ findings: DocFinding[] }>(
        'extract',
        '/v1/extract',
        payload,
      );
    } catch (error) {
      response = this.baselineExtract(
        input.tenantId,
        requestId,
        input.text,
        input.purpose,
        input.retention,
      );
      fallback = true;
    }

    const findingRecords = await doclingRepository.saveFindings(
      input.tenantId,
      requestId,
      response.result.findings.map((finding) => ({
        fragmentId: finding.fragmentId,
        label: finding.label,
        value: finding.value,
        confidence: finding.confidence,
        severity: finding.severity,
        metadata: {
          qualitySignals: finding.qualitySignals,
        },
      })),
    );

    const findings: DocFinding[] = findingRecords.map((record) => ({
      id: record.id,
      fragmentId: record.fragmentId ?? undefined,
      label: record.label,
      value: record.value,
      confidence: record.confidence ?? 0,
      severity: (record.severity ?? undefined) as
        | DocFinding['severity']
        | undefined,
      metadata: record.metadata || {},
      qualitySignals:
        (record.metadata?.qualitySignals as
          | Record<string, unknown>
          | undefined) ?? {},
    }));

    const policySignalRecords = await doclingRepository.savePolicySignals(
      input.tenantId,
      requestId,
      response.policySignals.map((signal) => ({
        classification: signal.classification,
        value: signal.value,
        purpose: signal.purpose,
        retention: signal.retention,
        fragmentId: signal.fragmentId,
        metadata: { qualitySignals: signal.qualitySignals },
      })),
    );

    const policySignals = policySignalRecords.map((record) => ({
      id: record.id,
      classification: record.classification,
      value: record.value,
      purpose: record.purpose,
      retention: record.retention,
      fragmentId: record.fragmentId ?? undefined,
      metadata: record.metadata || {},
      qualitySignals:
        (record.metadata?.qualitySignals as
          | Record<string, number>
          | undefined) ?? undefined,
    }));

    if (fallback) {
      this.recordUsageMetrics(
        'extractLicensesFallback',
        input.tenantId,
        response.usage,
      );
    }

    provenanceLedger.appendEntry({
      tenantId: input.tenantId,
      actionType: 'docling_extract_licenses',
      resourceType: 'artifact',
      resourceId: requestId,
      actorId: 'docling-service',
      actorType: 'system',
      timestamp: new Date(),
      payload: {
        findings: findings.length,
        usage: response.usage,
      },
      metadata: {
        sourceType: input.sourceType,
        purpose: input.purpose,
      },
    } as any);

    return {
      findings,
      policySignals,
    };
  }

  async generateReleaseNotes(
    input: ReleaseNotesInput,
  ): Promise<ReleaseNotesResult> {
    const requestId = input.requestId || randomUUID();
    const payload = {
      requestId,
      tenantId: input.tenantId,
      purpose: input.purpose,
      retention: input.retention,
      text: input.diffText,
      focus: 'changelog' as const,
      maxTokens: 400,
    };

    let response: DoclingBaseResponse<DocSummary>;
    let fallback = false;
    try {
      response = await this.callDocling<DocSummary>(
        'summarize',
        '/v1/summarize',
        payload,
      );
    } catch (error) {
      response = this.baselineSummary(
        input.tenantId,
        requestId,
        input.diffText,
        input.purpose,
        input.retention,
        'changelog',
      );
      fallback = true;
    }

    await doclingRepository.saveSummary(
      input.tenantId,
      requestId,
      'RELEASE',
      response.result.focus,
      response.result.text,
      response.result.highlights,
      response.result.qualitySignals,
    );

    if (fallback) {
      this.recordUsageMetrics(
        'generateReleaseNotesFallback',
        input.tenantId,
        response.usage,
      );
    }

    return {
      summary: response.result,
    };
  }

  private async callDocling<T>(
    operation: DoclingCallOptions['operation'],
    path: string,
    payload: unknown,
  ): Promise<DoclingBaseResponse<T>> {
    const endTimer = doclingInferenceDuration.startTimer({
      operation,
      tenant_id: (payload as any).tenantId,
    });
    try {
      const { data } = await this.http.post<T>(path, payload);
      endTimer();
      doclingInferenceTotal.labels(operation, 'success').inc();
      const usage = (data as any).usage;
      if (usage) {
        doclingCharactersProcessed
          .labels((payload as any).tenantId, operation)
          .inc(usage.characters || 0);
        doclingCostUsd
          .labels((payload as any).tenantId)
          .inc(usage.costUsd || 0);
        tenantCostService.recordDoclingCost(
          (payload as any).tenantId,
          usage.costUsd || 0,
          {
            requestId: (data as any).requestId,
            operation,
          },
        );
      }
      return data as DoclingBaseResponse<T>;
    } catch (error) {
      endTimer();
      doclingInferenceTotal.labels(operation, 'error').inc();
      throw error;
    }
  }

  private recordUsageMetrics(
    operation: string,
    tenantId: string,
    usage: { characters: number; costUsd: number },
  ) {
    doclingCharactersProcessed
      .labels(tenantId, operation)
      .inc(usage.characters || 0);
    doclingCostUsd.labels(tenantId).inc(usage.costUsd || 0);
  }

  private baselineParse(
    tenantId: string,
    requestId: string,
    text: string,
    purpose: string,
    retention: string,
  ): DoclingBaseResponse<{ fragments: DocFragment[] }> {
    const fragments = text
      .split(/\n{2,}/)
      .slice(0, 10)
      .map((chunk, index) => ({
        id: `${requestId}-fragment-${index}`,
        sha256: createHash('sha256').update(chunk).digest('hex'),
        text: chunk,
        mimeType: 'text/plain',
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

  private baselineSummary(
    tenantId: string,
    requestId: string,
    text: string,
    purpose: string,
    retention: string,
    focus: 'failures' | 'changelog' | 'compliance' = 'failures',
  ): DoclingBaseResponse<DocSummary> {
    const lines = text.split('\n').filter(Boolean);
    const failures = lines
      .filter((line) => /error|fail/i.test(line))
      .slice(0, 3);
    const summaryText = failures.length
      ? `Heuristic ${focus} summary: ${failures.join(' ')}`
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

  private baselineExtract(
    tenantId: string,
    requestId: string,
    text: string,
    purpose: string,
    retention: string,
  ): DoclingBaseResponse<{ findings: DocFinding[] }> {
    const licenseMatch = text.match(/license[:\s]+([A-Za-z0-9\-\.]+)/i);
    const findings: DocFinding[] = licenseMatch
      ? [
          {
            id: `${requestId}-license`,
            label: 'license',
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

export const doclingService = new DoclingService();

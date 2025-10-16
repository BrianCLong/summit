import axios, { AxiosInstance } from 'axios';
import crypto from 'crypto';
import { loadConfig } from './config.js';
import {
  DocFragment,
  ExtractionFinding,
  Focus,
  ParseRequestBody,
  ParseResponseBody,
  PolicySignal,
  SummarizeRequestBody,
  SummarizeResponseBody,
  ExtractRequestBody,
  ExtractResponseBody,
} from './types.js';

const config = loadConfig();

interface RemoteResponse {
  fragments?: DocFragment[];
  summary?: string;
  highlights?: string[];
  findings?: Array<Omit<ExtractionFinding, 'qualitySignals'>>;
  qualitySignals?: Record<string, number>;
  policySignals?: PolicySignal[];
  tokens?: number;
}

export class GraniteDoclingClient {
  private http: AxiosInstance | null = null;

  private getHttp(): AxiosInstance {
    if (!config.GRANITE_DOCLING_ENDPOINT) {
      throw new Error('GRANITE_DOCLING_ENDPOINT not configured');
    }
    if (!this.http) {
      this.http = axios.create({
        baseURL: config.GRANITE_DOCLING_ENDPOINT,
        timeout: config.timeoutMs,
        headers: {
          'x-model-id': config.GRANITE_DOCLING_MODEL_ID,
          ...(config.GRANITE_DOCLING_API_KEY
            ? { Authorization: `Bearer ${config.GRANITE_DOCLING_API_KEY}` }
            : {}),
        },
      });
    }
    return this.http;
  }

  async parse(payload: ParseRequestBody): Promise<ParseResponseBody> {
    const start = Date.now();
    const response = await this.invokeRemote('/parse', payload);
    const fragments =
      response.fragments ||
      synthesizeFragments(
        payload.bytes
          ? Buffer.from(payload.bytes, 'base64').toString('utf8')
          : '',
      );
    const latencyMs = Date.now() - start;
    return {
      requestId: payload.requestId,
      tenantId: payload.tenantId,
      purpose: payload.purpose,
      retention: payload.retention,
      provenance: {
        requestId: payload.requestId,
        modelId: config.GRANITE_DOCLING_MODEL_ID,
        modelCheckpoint: '258m-main',
        promptHash: hashPrompt(payload),
        parameters: { hints: payload.hints, contentType: payload.contentType },
        policyTags: [],
        timestamp: new Date().toISOString(),
      },
      usage: {
        characters: fragments.reduce(
          (acc, fragment) => acc + fragment.text.length,
          0,
        ),
        tokens: response.tokens,
        costUsd: this.estimateCost(fragments),
        latencyMs,
      },
      result: { fragments },
      policySignals: response.policySignals || [],
    };
  }

  async summarize(
    payload: SummarizeRequestBody,
  ): Promise<SummarizeResponseBody> {
    const start = Date.now();
    const response = await this.invokeRemote('/summarize', payload);
    const summary =
      response.summary || synthesizeSummary(payload.text, payload.focus);
    const latencyMs = Date.now() - start;
    return {
      requestId: payload.requestId,
      tenantId: payload.tenantId,
      purpose: payload.purpose,
      retention: payload.retention,
      provenance: {
        requestId: payload.requestId,
        modelId: config.GRANITE_DOCLING_MODEL_ID,
        modelCheckpoint: '258m-main',
        promptHash: hashPrompt(payload),
        parameters: { focus: payload.focus, maxTokens: payload.maxTokens },
        policyTags: [],
        timestamp: new Date().toISOString(),
      },
      usage: {
        characters: payload.text.length,
        tokens: response.tokens,
        costUsd: this.estimateCost(payload.text),
        latencyMs,
      },
      result: {
        id: payload.requestId,
        text: summary,
        focus: payload.focus,
        highlights: response.highlights || deriveHighlights(summary),
        qualitySignals: response.qualitySignals || {
          relevance: 0.82,
          actionability: 0.78,
        },
      },
      policySignals: response.policySignals || [],
    };
  }

  async extract(payload: ExtractRequestBody): Promise<ExtractResponseBody> {
    const start = Date.now();
    const response = await this.invokeRemote('/extract', payload);
    const source =
      payload.text ||
      (payload.bytes
        ? Buffer.from(payload.bytes, 'base64').toString('utf8')
        : '');
    const findings =
      response.findings || synthesizeFindings(source, payload.targets);
    const latencyMs = Date.now() - start;
    return {
      requestId: payload.requestId,
      tenantId: payload.tenantId,
      purpose: payload.purpose,
      retention: payload.retention,
      provenance: {
        requestId: payload.requestId,
        modelId: config.GRANITE_DOCLING_MODEL_ID,
        modelCheckpoint: '258m-main',
        promptHash: hashPrompt(payload),
        parameters: { targets: payload.targets },
        policyTags: [],
        timestamp: new Date().toISOString(),
      },
      usage: {
        characters: source.length,
        tokens: response.tokens,
        costUsd: this.estimateCost(source),
        latencyMs,
      },
      result: {
        findings: findings.map((finding) => ({
          ...finding,
          qualitySignals: response.qualitySignals || {
            confidence: finding.confidence,
          },
        })),
      },
      policySignals: response.policySignals || [],
    };
  }

  private async invokeRemote(
    path: string,
    payload: unknown,
  ): Promise<RemoteResponse> {
    if (!config.GRANITE_DOCLING_ENDPOINT) {
      return {};
    }

    const { data } = await this.getHttp().post<RemoteResponse>(path, payload);
    return data;
  }

  private estimateCost(input: { text: string }[] | string): number {
    const chars = Array.isArray(input)
      ? input.reduce((acc, item) => acc + item.text.length, 0)
      : input.length;
    return Number(((chars / 1000) * config.pricePer1kChars).toFixed(6));
  }
}

const hashPrompt = (payload: unknown): string =>
  crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex');

const synthesizeSummary = (text: string, focus: Focus): string => {
  if (!text) return 'No content provided.';
  const lines = text.split('\n').filter(Boolean);
  const head = lines.slice(0, 5).join(' ');
  switch (focus) {
    case 'failures':
      return `Failure summary: ${head}`;
    case 'changelog':
      return `Release notes: ${head}`;
    case 'compliance':
      return `Compliance digest: ${head}`;
    default:
      return head;
  }
};

const synthesizeFragments = (text: string): DocFragment[] => {
  if (!text) {
    return [];
  }
  return text
    .split(/\n{2,}/)
    .filter(Boolean)
    .slice(0, 20)
    .map((chunk, idx) => ({
      id: `fragment-${idx}`,
      sha256: hashPrompt(chunk),
      mimeType: 'text/plain',
      sizeBytes: Buffer.byteLength(chunk),
      language: 'en',
      text: chunk.trim(),
      metadata: { ordinal: idx },
    }));
};

const deriveHighlights = (summary: string): string[] => {
  return summary
    .split(/[.\n]/)
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 3);
};

const synthesizeFindings = (
  text: string,
  targets: ExtractRequestBody['targets'],
): Array<Omit<ExtractionFinding, 'qualitySignals'>> => {
  const findings: Array<Omit<ExtractionFinding, 'qualitySignals'>> = [];
  if (targets.includes('license')) {
    const licenseMatch = text.match(/license[:\s]+([A-Za-z0-9\-\.]+)/i);
    if (licenseMatch) {
      findings.push({
        id: 'license-0',
        label: 'license',
        value: licenseMatch[1],
        confidence: 0.88,
      });
    }
  }
  if (targets.includes('version')) {
    const versionMatch = text.match(/version[:\s]+([0-9]+\.[0-9]+\.[0-9]+)/i);
    if (versionMatch) {
      findings.push({
        id: 'version-0',
        label: 'version',
        value: versionMatch[1],
        confidence: 0.74,
      });
    }
  }
  if (targets.includes('cve')) {
    const cveMatches = text.match(/CVE-\d{4}-\d{4,7}/gi) || [];
    cveMatches
      .slice(0, 5)
      .forEach((match, index) =>
        findings.push({
          id: `cve-${index}`,
          label: 'cve',
          value: match,
          confidence: 0.65,
        }),
      );
  }
  if (targets.includes('owner')) {
    const ownerMatch = text.match(/owner[:\s]+([A-Za-z\s]+)/i);
    if (ownerMatch) {
      findings.push({
        id: 'owner-0',
        label: 'owner',
        value: ownerMatch[1].trim(),
        confidence: 0.7,
      });
    }
  }
  return findings;
};

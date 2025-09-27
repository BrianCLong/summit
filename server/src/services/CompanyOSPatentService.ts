import logger from '../utils/logger';

export interface PatentSearchParams {
  keywords: string[];
  classifications?: string[];
  jurisdictions?: string[];
  fromDate?: string;
  toDate?: string;
  limit?: number;
}

export interface PatentRecord {
  patentId: string;
  title: string;
  abstract: string;
  claims: string[];
  assignee?: string;
  filingDate?: string;
  publicationDate?: string;
  url?: string;
  classifications?: string[];
  jurisdiction?: string;
  citations?: string[];
}

export interface IPAssetDocument {
  name: string;
  content: string;
  type?: string;
}

export interface IPAsset {
  id: string;
  title: string;
  description: string;
  claims: string[];
  keywords?: string[];
  documents?: IPAssetDocument[];
  technologyArea?: string;
  maturity?: 'concept' | 'prototype' | 'production';
}

export interface PatentMatch {
  record: PatentRecord;
  similarityScore: number;
  keywordScore: number;
  claimOverlapScore: number;
  recencyScore: number;
  overlappingKeywords: string[];
  overlappingClaims: string[];
  noveltyGaps: string[];
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
}

export interface PatentFilingDraft {
  assetId: string;
  recommendedTitle: string;
  summary: string;
  noveltyStatement: string;
  claims: string[];
  references: string[];
  jurisdictions: string[];
  risks: PatentMatch[];
  supportingDocuments: IPAssetDocument[];
  claimGaps: string[];
  differentiationStrategies: string[];
  recommendedActions: string[];
}

export interface PatentDataProvider {
  searchPatents(params: PatentSearchParams): Promise<PatentRecord[]>;
  getPatent(patentId: string): Promise<PatentRecord | null>;
}

export interface CompanyOSPatentServiceOptions {
  provider?: PatentDataProvider;
  similarityThreshold?: number;
  maxResults?: number;
}

const STOP_WORDS = new Set([
  'the',
  'and',
  'for',
  'with',
  'that',
  'from',
  'this',
  'have',
  'has',
  'into',
  'about',
  'there',
  'their',
  'which',
  'using',
  'through',
  'being',
  'such',
  'within',
  'between',
  'into',
  'onto',
  'upon',
  'over',
  'under',
  'while',
  'where',
  'when',
  'will',
  'shall',
]);

class HttpPatentDataProvider implements PatentDataProvider {
  private readonly baseUrl: string;
  private readonly fetchImpl: typeof fetch;

  constructor(baseUrl: string, fetchImpl: typeof fetch = fetch) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.fetchImpl = fetchImpl;
  }

  async searchPatents(params: PatentSearchParams): Promise<PatentRecord[]> {
    try {
      const response = await this.fetchImpl(`${this.baseUrl}/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });

      if (!response.ok) {
        throw new Error(`Registry responded with status ${response.status}`);
      }

      const payload = (await response.json()) as { patents?: PatentRecord[] };
      const patents = payload.patents ?? [];

      logger.info('Patent search completed', {
        baseUrl: this.baseUrl,
        resultCount: patents.length,
      });

      return patents;
    } catch (error: any) {
      logger.error('Failed to search patent registry', {
        baseUrl: this.baseUrl,
        error: error?.message,
      });
      throw new Error('Patent registry unavailable');
    }
  }

  async getPatent(patentId: string): Promise<PatentRecord | null> {
    try {
      const response = await this.fetchImpl(`${this.baseUrl}/patents/${encodeURIComponent(patentId)}`);

      if (!response.ok) {
        logger.warn('Patent registry lookup returned non-success status', {
          baseUrl: this.baseUrl,
          patentId,
          status: response.status,
        });
        return null;
      }

      const payload = (await response.json()) as { patent?: PatentRecord };
      return payload.patent ?? null;
    } catch (error: any) {
      logger.error('Failed to retrieve patent', {
        baseUrl: this.baseUrl,
        patentId,
        error: error?.message,
      });
      return null;
    }
  }
}

export class CompanyOSPatentService {
  private provider: PatentDataProvider;
  private similarityThreshold: number;
  private maxResults: number;

  constructor(options: CompanyOSPatentServiceOptions = {}) {
    const registryUrl = process.env.PATENT_REGISTRY_API || 'https://patents.companyos.local/api';
    this.provider = options.provider || new HttpPatentDataProvider(registryUrl);
    this.similarityThreshold = options.similarityThreshold ?? 0.45;
    this.maxResults = options.maxResults ?? 10;
  }

  async scanIntellectualProperty(
    asset: IPAsset,
    overrides: Partial<PatentSearchParams> = {},
  ): Promise<PatentMatch[]> {
    if (!asset?.id) {
      throw new Error('Asset id is required for patent scanning');
    }

    const keywords = this.buildKeywordList(asset);
    const searchParams: PatentSearchParams = {
      keywords,
      classifications: asset.technologyArea ? [asset.technologyArea] : undefined,
      jurisdictions: overrides.jurisdictions,
      fromDate: overrides.fromDate,
      toDate: overrides.toDate,
      limit: overrides.limit ?? this.maxResults,
    };

    logger.info('Scanning intellectual property against patent registry', {
      assetId: asset.id,
      keywordCount: keywords.length,
      classifications: searchParams.classifications,
      jurisdictions: searchParams.jurisdictions,
    });

    const patents = await this.provider.searchPatents(searchParams);
    const matches = patents
      .map((record) => this.evaluateMatch(asset, record))
      .filter((match) => match.similarityScore >= this.similarityThreshold)
      .sort((a, b) => b.similarityScore - a.similarityScore)
      .slice(0, this.maxResults);

    logger.info('Patent scan complete', {
      assetId: asset.id,
      matches: matches.length,
    });

    return matches;
  }

  async preparePatentFiling(asset: IPAsset, matches?: PatentMatch[]): Promise<PatentFilingDraft> {
    const relevantMatches = matches ?? (await this.scanIntellectualProperty(asset));
    const references = relevantMatches.map((match) => match.record.patentId);
    const jurisdictions = this.deriveJurisdictions(asset, relevantMatches);

    return {
      assetId: asset.id,
      recommendedTitle: asset.title,
      summary: this.buildSummary(asset, relevantMatches),
      noveltyStatement: this.buildNoveltyStatement(asset, relevantMatches),
      claims: asset.claims,
      references,
      jurisdictions,
      risks: relevantMatches,
      supportingDocuments: asset.documents ?? [],
      claimGaps: this.identifyClaimGaps(asset, relevantMatches),
      differentiationStrategies: this.buildDifferentiationStrategies(asset, relevantMatches),
      recommendedActions: this.buildRecommendedActions(asset, relevantMatches),
    };
  }

  private buildKeywordList(asset: IPAsset): string[] {
    const explicitKeywords = asset.keywords || [];
    const derived = this.extractKeywords(`${asset.title} ${asset.description} ${asset.claims.join(' ')}`);
    const allKeywords = new Set<string>();
    [...explicitKeywords, ...derived].forEach((kw) => {
      if (kw && kw.length > 2) {
        allKeywords.add(kw.toLowerCase());
      }
    });
    return Array.from(allKeywords);
  }

  private evaluateMatch(asset: IPAsset, record: PatentRecord): PatentMatch {
    const assetText = `${asset.title}\n${asset.description}\n${asset.claims.join('\n')}`;
    const patentText = `${record.title}\n${record.abstract}\n${record.claims.join('\n')}`;
    const similarity = this.computeSimilarity(assetText, patentText);
    const overlappingKeywords = this.findOverlappingKeywords(asset, record);
    const overlappingClaims = this.findClaimOverlap(asset.claims, record.claims);
    const keywordScore = this.computeKeywordScore(asset, record, overlappingKeywords);
    const claimOverlapScore = this.computeClaimOverlapScore(asset.claims, overlappingClaims);
    const recencyScore = this.computeRecencyScore(record.filingDate);
    const noveltyGaps = this.identifyNoveltyGaps(asset, overlappingClaims);

    return {
      record,
      similarityScore: Number(similarity.toFixed(4)),
      keywordScore: Number(keywordScore.toFixed(4)),
      claimOverlapScore: Number(claimOverlapScore.toFixed(4)),
      recencyScore: Number(recencyScore.toFixed(4)),
      overlappingKeywords,
      overlappingClaims,
      noveltyGaps,
      riskLevel: this.scoreRisk({
        similarity,
        overlappingClaims: overlappingClaims.length,
        keywordScore,
        claimOverlapScore,
        recencyScore,
      }),
    };
  }

  private computeSimilarity(left: string, right: string): number {
    const leftTokens = this.tokenize(left);
    const rightTokens = this.tokenize(right);

    if (!leftTokens.length || !rightTokens.length) {
      return 0;
    }

    const leftFreq = this.termFrequency(leftTokens);
    const rightFreq = this.termFrequency(rightTokens);
    const uniqueTerms = new Set([...leftTokens, ...rightTokens]);

    let dotProduct = 0;
    let leftMagnitude = 0;
    let rightMagnitude = 0;

    uniqueTerms.forEach((term) => {
      const l = leftFreq.get(term) ?? 0;
      const r = rightFreq.get(term) ?? 0;
      dotProduct += l * r;
    });

    leftFreq.forEach((value) => {
      leftMagnitude += value * value;
    });

    rightFreq.forEach((value) => {
      rightMagnitude += value * value;
    });

    if (!leftMagnitude || !rightMagnitude) {
      return 0;
    }

    return dotProduct / Math.sqrt(leftMagnitude * rightMagnitude);
  }

  private tokenize(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .map((token) => token.trim())
      .filter((token) => token.length > 2 && !STOP_WORDS.has(token));
  }

  private termFrequency(tokens: string[]): Map<string, number> {
    const counts = new Map<string, number>();
    tokens.forEach((token) => {
      counts.set(token, (counts.get(token) || 0) + 1);
    });
    return counts;
  }

  private extractKeywords(text: string): string[] {
    const tokens = this.tokenize(text);
    const frequency = this.termFrequency(tokens);
    const ranked = Array.from(frequency.entries()).sort((a, b) => b[1] - a[1]);
    return ranked.slice(0, 12).map(([token]) => token);
  }

  private findOverlappingKeywords(asset: IPAsset, record: PatentRecord): string[] {
    const assetKeywords = this.buildKeywordList(asset);
    const patentKeywords = this.extractKeywords(
      `${record.title} ${record.abstract} ${record.claims.join(' ')}`,
    );
    const overlap = assetKeywords.filter((keyword) => patentKeywords.includes(keyword));
    return Array.from(new Set(overlap)).slice(0, 12);
  }

  private findClaimOverlap(assetClaims: string[], patentClaims: string[]): string[] {
    const overlaps: string[] = [];
    assetClaims.forEach((claim) => {
      const claimTokens = this.tokenize(claim);
      if (!claimTokens.length) {
        return;
      }
      const claimSet = new Set(claimTokens);
      patentClaims.forEach((patentClaim) => {
        const patentTokens = this.tokenize(patentClaim);
        if (!patentTokens.length) {
          return;
        }
        const common = patentTokens.filter((token) => claimSet.has(token));
        if (common.length >= Math.min(4, claimTokens.length)) {
          overlaps.push(patentClaim);
        }
      });
    });
    return Array.from(new Set(overlaps)).slice(0, 10);
  }

  private scoreRisk(metrics: {
    similarity: number;
    overlappingClaims: number;
    keywordScore: number;
    claimOverlapScore: number;
    recencyScore: number;
  }): 'LOW' | 'MEDIUM' | 'HIGH' {
    const composite =
      metrics.similarity * 0.5 + metrics.keywordScore * 0.2 + metrics.claimOverlapScore * 0.2 + metrics.recencyScore * 0.1;

    if (composite >= 0.75 || metrics.overlappingClaims >= 3 || metrics.claimOverlapScore >= 0.8) {
      return 'HIGH';
    }
    if (composite >= 0.55 || metrics.overlappingClaims >= 1 || metrics.keywordScore >= 0.5) {
      return 'MEDIUM';
    }
    return 'LOW';
  }

  private buildSummary(asset: IPAsset, matches: PatentMatch[]): string {
    const keywords = this.buildKeywordList(asset).slice(0, 6).join(', ');
    const proximity = matches.slice(0, 3).map((match) => match.record.title).join('; ');
    return `Asset "${asset.title}" focuses on ${keywords || 'key innovations'} with maturity ${
      asset.maturity || 'concept'
    }. Closest prior art: ${proximity || 'none identified above threshold'}.`;
  }

  private buildNoveltyStatement(asset: IPAsset, matches: PatentMatch[]): string {
    const differentiators: string[] = [];
    if (matches.length === 0) {
      differentiators.push('No materially similar patents were identified.');
    } else {
      const lowRisk = matches.filter((match) => match.riskLevel === 'LOW');
      if (lowRisk.length) {
        differentiators.push(
          `${lowRisk.length} related patents were found with low similarity, highlighting differentiated implementation details.`,
        );
      }
      const mediumRisk = matches.filter((match) => match.riskLevel === 'MEDIUM');
      if (mediumRisk.length) {
        differentiators.push(
          `${mediumRisk.length} medium risk references need claim refinement to emphasize unique data handling, orchestration, or automation layers.`,
        );
      }
    }

    differentiators.push(
      `Core claims emphasize ${asset.claims.slice(0, 2).join(' and ') || 'novel orchestration of CompanyOS assets'}.`,
    );

    return differentiators.join(' ');
  }

  private identifyClaimGaps(asset: IPAsset, matches: PatentMatch[]): string[] {
    if (!asset.claims?.length) {
      return [];
    }

    const coveredClaims = new Set<string>();
    matches.forEach((match) => {
      match.overlappingClaims.forEach((claim) => coveredClaims.add(claim));
    });

    const gaps: string[] = [];
    asset.claims.forEach((claim) => {
      const tokens = this.tokenize(claim);
      if (tokens.length === 0) {
        return;
      }

      const isCovered = Array.from(coveredClaims).some((covered) => {
        const coveredTokens = this.tokenize(covered);
        if (!coveredTokens.length) {
          return false;
        }
        const overlap = coveredTokens.filter((token) => tokens.includes(token));
        return overlap.length >= Math.min(4, tokens.length);
      });

      if (!isCovered) {
        gaps.push(`Claim gap detected: ${claim.slice(0, 160)}${claim.length > 160 ? '…' : ''}`);
      }
    });

    return gaps.slice(0, 6);
  }

  private buildDifferentiationStrategies(asset: IPAsset, matches: PatentMatch[]): string[] {
    const strategies = new Set<string>();
    if (!matches.length) {
      strategies.add('Highlight complete novelty: no materially similar prior art surfaced in registry scans.');
    }

    const highRisk = matches.filter((match) => match.riskLevel === 'HIGH');
    if (highRisk.length) {
      strategies.add('Escalate high-risk overlaps for claim redrafting emphasizing unique orchestration and compliance flows.');
    }

    const mediumRisk = matches.filter((match) => match.riskLevel === 'MEDIUM');
    if (mediumRisk.length) {
      strategies.add('Introduce dependent claims tightening scope around data handling, automation layers, and telemetry safeguards.');
    }

    if (asset.maturity === 'production') {
      strategies.add('Leverage production proof points and customer impact metrics to reinforce commercial distinctiveness.');
    }

    if ((asset.documents ?? []).some((doc) => doc.name.toLowerCase().includes('threat'))) {
      strategies.add('Frame cybersecurity posture as a differentiator with explicit threat-model claims.');
    }

    if (!strategies.size) {
      strategies.add('Use implementation specifics (pipelines, policy intelligence, automation) to emphasise novelty.');
    }

    return Array.from(strategies).slice(0, 5);
  }

  private buildRecommendedActions(asset: IPAsset, matches: PatentMatch[]): string[] {
    const actions = new Set<string>();

    actions.add('Schedule cross-functional review with legal and engineering to validate claim coverage.');

    if (matches.some((match) => match.riskLevel === 'HIGH')) {
      actions.add('Initiate immediate provisional filing updates to mitigate blocking prior art.');
    }

    if (matches.some((match) => match.recencyScore >= 0.6)) {
      actions.add('Monitor ongoing filings in overlapping jurisdictions for fast-follow activity.');
    }

    if ((asset.documents ?? []).length >= 3) {
      actions.add('Package supporting documents into annexes for streamlined counsel handoff.');
    }

    if (!matches.length) {
      actions.add('Proceed with accelerated filing timeline leveraging clear white-space confirmation.');
    }

    return Array.from(actions).slice(0, 5);
  }

  private computeKeywordScore(asset: IPAsset, record: PatentRecord, overlappingKeywords: string[]): number {
    const assetKeywords = new Set(this.buildKeywordList(asset));
    const patentKeywords = new Set(
      this.extractKeywords(`${record.title} ${record.abstract} ${record.claims.join(' ')}`),
    );
    const unionSize = new Set([...assetKeywords, ...patentKeywords]).size;
    if (unionSize === 0) {
      return 0;
    }
    const intersectionSize = overlappingKeywords.length;
    return intersectionSize / unionSize;
  }

  private computeClaimOverlapScore(assetClaims: string[], overlappingClaims: string[]): number {
    if (!assetClaims.length) {
      return 0;
    }
    const matchedAssetClaims = assetClaims.filter((claim) =>
      overlappingClaims.some((overlap) => {
        const claimTokens = this.tokenize(claim);
        const overlapTokens = this.tokenize(overlap);
        if (!claimTokens.length || !overlapTokens.length) {
          return false;
        }
        const common = overlapTokens.filter((token) => claimTokens.includes(token));
        return common.length >= Math.min(4, claimTokens.length);
      }),
    );

    return matchedAssetClaims.length / assetClaims.length;
  }

  private computeRecencyScore(filingDate?: string): number {
    if (!filingDate) {
      return 0;
    }
    const timestamp = Date.parse(filingDate);
    if (Number.isNaN(timestamp)) {
      return 0;
    }
    const years = (Date.now() - timestamp) / (1000 * 60 * 60 * 24 * 365.25);
    if (years <= 0) {
      return 1;
    }
    if (years >= 10) {
      return 0;
    }
    return Number(Math.max(0, 1 - years / 10));
  }

  private identifyNoveltyGaps(asset: IPAsset, overlappingClaims: string[]): string[] {
    if (!asset.claims.length) {
      return [];
    }

    if (!overlappingClaims.length) {
      return asset.claims
        .slice(0, 3)
        .map((claim) => `Unique claim retained: ${claim.slice(0, 160)}${claim.length > 160 ? '…' : ''}`);
    }

    return asset.claims
      .filter((claim) => {
        const claimTokens = this.tokenize(claim);
        if (!claimTokens.length) {
          return false;
        }
        return !overlappingClaims.some((overlap) => {
          const overlapTokens = this.tokenize(overlap);
          const common = overlapTokens.filter((token) => claimTokens.includes(token));
          return common.length >= Math.min(4, claimTokens.length);
        });
      })
      .map((claim) => `Distinct differentiation opportunity: ${claim.slice(0, 160)}${claim.length > 160 ? '…' : ''}`)
      .slice(0, 4);
  }

  private deriveJurisdictions(asset: IPAsset, matches: PatentMatch[]): string[] {
    const jurisdictions = new Set<string>();
    matches.forEach((match) => {
      if (match.record.jurisdiction) {
        jurisdictions.add(match.record.jurisdiction);
      }
    });
    if (asset.technologyArea === 'defense') {
      jurisdictions.add('US');
      jurisdictions.add('EU');
    }
    if (jurisdictions.size === 0) {
      jurisdictions.add('US');
    }
    return Array.from(jurisdictions);
  }
}

export default CompanyOSPatentService;

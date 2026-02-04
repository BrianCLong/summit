
import crypto from 'crypto';
import {
  Claim,
  OSINTEnrichmentResult,
  SocialMediaProfile,
  CorporateRecord,
  PublicRecord,
} from './types.js';

/**
 * ClaimExtractor - Automation Turn #5 Implementation
 *
 * Extracts discrete, atomic claims from OSINT enrichment results.
 * Each claim represents a single assertion about an entity that can be
 * independently verified, regardless of source trust level.
 */
export class ClaimExtractor {
  /**
   * Extract all claims from a set of enrichment results.
   * Each enrichment result may yield multiple claims.
   */
  extract(enrichmentResults: OSINTEnrichmentResult[]): Claim[] {
    const claims: Claim[] = [];

    for (const result of enrichmentResults) {
      if (!result.data) continue;

      const extractedClaims = this.extractFromResult(result);
      claims.push(...extractedClaims);
    }

    return claims;
  }

  private extractFromResult(result: OSINTEnrichmentResult): Claim[] {
    const { source, data, confidence } = result;

    if (this.isSocialMediaProfile(data)) {
      return this.extractFromSocialProfile(source, data, confidence);
    }

    if (this.isCorporateRecord(data)) {
      return this.extractFromCorporateRecord(source, data, confidence);
    }

    if (this.isPublicRecord(data)) {
      return this.extractFromPublicRecord(source, data, confidence);
    }

    return [];
  }

  private extractFromSocialProfile(
    source: string,
    profile: SocialMediaProfile,
    baseConfidence: number
  ): Claim[] {
    const claims: Claim[] = [];
    const timestamp = new Date().toISOString();
    const subjectId = `${profile.platform}:${profile.username}`;

    // Claim: User exists on platform
    claims.push(this.createClaim({
      sourceId: source,
      subject: subjectId,
      predicate: 'hasAccount',
      object: { platform: profile.platform, url: profile.url },
      confidence: baseConfidence,
      timestamp,
    }));

    // Claim: Display name
    if (profile.displayName) {
      claims.push(this.createClaim({
        sourceId: source,
        subject: subjectId,
        predicate: 'hasDisplayName',
        object: profile.displayName,
        confidence: baseConfidence * 0.9,
        timestamp,
      }));
    }

    // Claim: Bio content
    if (profile.bio) {
      claims.push(this.createClaim({
        sourceId: source,
        subject: subjectId,
        predicate: 'hasBio',
        object: profile.bio,
        confidence: baseConfidence * 0.85,
        timestamp,
      }));
    }

    // Claim: Follower count (temporal - changes frequently)
    if (profile.followersCount !== undefined) {
      claims.push(this.createClaim({
        sourceId: source,
        subject: subjectId,
        predicate: 'hasFollowerCount',
        object: profile.followersCount,
        confidence: baseConfidence * 0.95,
        timestamp,
        validFrom: timestamp,
        validTo: this.addDays(timestamp, 1), // Follower counts valid for ~1 day
      }));
    }

    // Claim: Last activity
    if (profile.lastActive) {
      claims.push(this.createClaim({
        sourceId: source,
        subject: subjectId,
        predicate: 'lastActiveAt',
        object: profile.lastActive,
        confidence: baseConfidence * 0.9,
        timestamp,
      }));
    }

    return claims;
  }

  private extractFromCorporateRecord(
    source: string,
    record: CorporateRecord,
    baseConfidence: number
  ): Claim[] {
    const claims: Claim[] = [];
    const timestamp = new Date().toISOString();
    const subjectId = record.registrationNumber
      ? `corp:${record.jurisdiction || 'unknown'}:${record.registrationNumber}`
      : `corp:${record.companyName.toLowerCase().replace(/\s+/g, '-')}`;

    // Claim: Company exists
    claims.push(this.createClaim({
      sourceId: source,
      subject: subjectId,
      predicate: 'isRegisteredAs',
      object: record.companyName,
      confidence: baseConfidence,
      timestamp,
    }));

    // Claim: Jurisdiction
    if (record.jurisdiction) {
      claims.push(this.createClaim({
        sourceId: source,
        subject: subjectId,
        predicate: 'registeredInJurisdiction',
        object: record.jurisdiction,
        confidence: baseConfidence,
        timestamp,
      }));
    }

    // Claim: Incorporation date
    if (record.incorporationDate) {
      claims.push(this.createClaim({
        sourceId: source,
        subject: subjectId,
        predicate: 'incorporatedOn',
        object: record.incorporationDate,
        confidence: baseConfidence,
        timestamp,
        validFrom: record.incorporationDate,
      }));
    }

    // Claim: Status (temporal)
    if (record.status) {
      claims.push(this.createClaim({
        sourceId: source,
        subject: subjectId,
        predicate: 'hasStatus',
        object: record.status,
        confidence: baseConfidence * 0.95,
        timestamp,
        validFrom: timestamp,
      }));
    }

    // Claims: Officers
    if (record.officers) {
      for (const officer of record.officers) {
        claims.push(this.createClaim({
          sourceId: source,
          subject: subjectId,
          predicate: 'hasOfficer',
          object: { name: officer.name, role: officer.role },
          confidence: baseConfidence * 0.9,
          timestamp,
          validFrom: timestamp,
        }));
      }
    }

    // Claim: Address
    if (record.address) {
      claims.push(this.createClaim({
        sourceId: source,
        subject: subjectId,
        predicate: 'locatedAt',
        object: record.address,
        confidence: baseConfidence * 0.85,
        timestamp,
        validFrom: timestamp,
      }));
    }

    return claims;
  }

  private extractFromPublicRecord(
    source: string,
    record: PublicRecord,
    baseConfidence: number
  ): Claim[] {
    const claims: Claim[] = [];
    const timestamp = new Date().toISOString();
    const subjectId = `public:${record.source}:${record.date}`;

    // Claim: Public record exists
    claims.push(this.createClaim({
      sourceId: source,
      subject: subjectId,
      predicate: 'hasRecordType',
      object: record.recordType,
      confidence: baseConfidence,
      timestamp,
      validFrom: record.date,
    }));

    // Claim: Record details (each key-value becomes a claim)
    for (const [key, value] of Object.entries(record.details)) {
      if (value !== null && value !== undefined) {
        claims.push(this.createClaim({
          sourceId: source,
          subject: subjectId,
          predicate: `detail:${key}`,
          object: value,
          confidence: baseConfidence * 0.8,
          timestamp,
          validFrom: record.date,
        }));
      }
    }

    return claims;
  }

  private createClaim(params: Omit<Claim, 'id' | 'verificationHistory'>): Claim {
    return {
      id: this.generateClaimId(params),
      ...params,
      verificationHistory: [],
    };
  }

  private generateClaimId(params: Omit<Claim, 'id' | 'verificationHistory'>): string {
    const hash = crypto
      .createHash('sha256')
      .update(`${params.sourceId}:${params.subject}:${params.predicate}:${JSON.stringify(params.object)}`)
      .digest('hex')
      .substring(0, 12);
    return `claim-${hash}`;
  }

  private addDays(isoDate: string, days: number): string {
    const date = new Date(isoDate);
    date.setDate(date.getDate() + days);
    return date.toISOString();
  }

  // Type guards
  private isSocialMediaProfile(data: unknown): data is SocialMediaProfile {
    return (
      typeof data === 'object' &&
      data !== null &&
      'platform' in data &&
      'username' in data
    );
  }

  private isCorporateRecord(data: unknown): data is CorporateRecord {
    return (
      typeof data === 'object' &&
      data !== null &&
      'companyName' in data
    );
  }

  private isPublicRecord(data: unknown): data is PublicRecord {
    return (
      typeof data === 'object' &&
      data !== null &&
      'recordType' in data &&
      'source' in data
    );
  }
}

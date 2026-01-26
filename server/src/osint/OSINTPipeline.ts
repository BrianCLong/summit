
import { EntityResolutionService } from './EntityResolutionService';
import { OSINTEnrichmentService } from './OSINTEnrichmentService';
import { OSINTQuery } from './connectors/types';
import { OSINTProfile } from './types';
import crypto from 'crypto';

export class OSINTPipeline {
  private resolutionService: EntityResolutionService;
  private enrichmentService: OSINTEnrichmentService;

  constructor() {
    this.resolutionService = new EntityResolutionService();
    this.enrichmentService = new OSINTEnrichmentService();
  }

  async process(query: OSINTQuery, tenantId: string): Promise<OSINTProfile> {
    console.log(`[OSINT Pipeline] Starting processing for: ${JSON.stringify(query)}`);

    // 1. Initial Search/Enrichment to get candidates
    const initialEnrichment = await this.enrichmentService.enrich(query);

    // [Automation Turn #5 Implementation Stub]
    // TODO: Extract discrete Claims from enrichment results.
    // TODO: Perform Claim-Centric Validation (independent of source trust).
    // TODO: Check for Contradictions (e.g. validFrom/validTo overlaps with conflicting data).
    // const claims = this.claimExtractor.extract(initialEnrichment);
    // const validatedClaims = await this.claimValidator.validate(claims);

    // Prepare a temporary profile for matching
    const candidateProfile: Partial<OSINTProfile> = {
      tenantId,
      kind: query.companyName ? 'organization' : 'person',
      ...initialEnrichment,
      properties: {
        name: query.name || query.companyName || query.username,
        ...query,
        ...(initialEnrichment.properties || {})
      },
    };

    // 2. Entity Resolution / Deduplication
    const existing = await this.resolutionService.resolve(candidateProfile);

    let finalProfile: OSINTProfile;

    if (existing) {
      console.log(`[OSINT Pipeline] Found existing profile: ${existing.id}. Merging.`);
      finalProfile = this.resolutionService.merge(existing, candidateProfile);
    } else {
      console.log(`[OSINT Pipeline] No existing profile found. Creating new.`);
      finalProfile = {
        id: crypto.randomUUID(),
        tenantId,
        kind: candidateProfile.kind || 'person',
        properties: candidateProfile.properties || {},
        externalRefs: candidateProfile.externalRefs || [],
        labels: candidateProfile.labels || [],
        sourceIds: ['osint-pipeline'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        socialProfiles: candidateProfile.socialProfiles || [],
        corporateRecords: candidateProfile.corporateRecords || [],
        publicRecords: candidateProfile.publicRecords || [],
        confidenceScore: candidateProfile.confidenceScore || 0,
        lastEnrichedAt: new Date().toISOString()
      };
    }

    // 3. Save Unified Profile
    await this.resolutionService.save(finalProfile);

    console.log(`[OSINT Pipeline] Processing complete. Profile ID: ${finalProfile.id}`);
    return finalProfile;
  }
}

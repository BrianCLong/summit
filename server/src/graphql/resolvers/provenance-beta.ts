/**
 * GraphQL Resolvers for Provenance Ledger Beta
 */

import { ProvenanceLedgerBetaService } from '../../services/provenance-ledger-beta.js';
import { ingestDocument } from '../../services/evidence-registration-flow.js';
import logger from '../../utils/logger.js';
import type {
  LicenseInput,
  SourceInput,
  TransformInput,
  EvidenceInput,
  ClaimInput,
  BundleCreateInput,
  ClaimQueryFilters,
} from '../../types/provenance-beta.js';

const provenanceLedger = ProvenanceLedgerBetaService.getInstance();

export const provenanceBetaResolvers = {
  Query: {
    // License queries
    license: async (_: any, { id }: { id: string }) => {
      return provenanceLedger.getLicense(id);
    },

    // Source queries
    source: async (_: any, { id }: { id: string }) => {
      return provenanceLedger.getSource(id);
    },

    // Transform queries
    transform: async (_: any, { id }: { id: string }) => {
      return provenanceLedger.getTransform(id);
    },

    transformChain: async (_: any, { ids }: { ids: string[] }) => {
      return provenanceLedger.getTransformChain(ids);
    },

    // Evidence queries
    evidence: async (_: any, { id }: { id: string }) => {
      return provenanceLedger.getEvidence(id);
    },

    // Claim queries
    claim: async (
      _: any,
      { id, includeProvenance }: { id: string; includeProvenance?: boolean },
    ) => {
      const claim = await provenanceLedger.getClaim(id);

      if (!claim) {
        return null;
      }

      if (includeProvenance) {
        const provenance = await provenanceLedger.getProvenanceChain(id);
        return {
          ...claim,
          provenance,
        };
      }

      return claim;
    },

    claims: async (_: any, { filters }: { filters?: ClaimQueryFilters }) => {
      return provenanceLedger.queryClaims(filters || {});
    },

    // Provenance chain queries
    provenanceChain: async (_: any, { itemId }: { itemId: string }) => {
      return provenanceLedger.getProvenanceChain(itemId);
    },

    // Export manifest queries
    exportManifest: async (_: any, { manifestId }: { manifestId: string }) => {
      // Would need to add getExportManifest method to service
      // For now, return null
      logger.warn('exportManifest query not fully implemented');
      return null;
    },

    verifyManifest: async (_: any, { manifestId }: { manifestId: string }) => {
      return provenanceLedger.verifyManifest(manifestId);
    },
  },

  Mutation: {
    // License mutations
    createLicense: async (_: any, { input }: { input: LicenseInput }) => {
      return provenanceLedger.createLicense(input);
    },

    // Source mutations
    registerSource: async (_: any, { input }: { input: SourceInput }) => {
      return provenanceLedger.registerSource(input);
    },

    // Transform mutations
    registerTransform: async (_: any, { input }: { input: TransformInput }) => {
      return provenanceLedger.registerTransform(input);
    },

    // Evidence mutations
    registerEvidence: async (_: any, { input }: { input: EvidenceInput }) => {
      return provenanceLedger.registerEvidence(input);
    },

    // Claim mutations
    registerClaim: async (_: any, { input }: { input: ClaimInput }) => {
      return provenanceLedger.registerClaim(input);
    },

    // Export mutations
    createExportManifest: async (
      _: any,
      { input }: { input: BundleCreateInput },
    ) => {
      return provenanceLedger.createExportManifest(input);
    },

    // Document ingestion
    ingestDocument: async (
      _: any,
      {
        input,
      }: {
        input: {
          documentPath?: string;
          documentContent: string;
          userId: string;
          investigationId?: string;
          licenseId: string;
          metadata?: Record<string, any>;
        };
      },
    ) => {
      return ingestDocument({
        documentPath: input.documentPath || 'inline-document',
        documentContent: input.documentContent,
        userId: input.userId,
        investigationId: input.investigationId,
        licenseId: input.licenseId,
        metadata: input.metadata,
      });
    },
  },

  // Field resolvers
  Source: {
    license: async (source: any) => {
      if (source.license) return source.license;
      return provenanceLedger.getLicense(source.license_id);
    },
  },

  Evidence: {
    source: async (evidence: any) => {
      if (evidence.source) return evidence.source;
      return provenanceLedger.getSource(evidence.source_id);
    },

    transform_chain: async (evidence: any) => {
      if (evidence.transform_chain && evidence.transform_chain[0]?.id) {
        return evidence.transform_chain;
      }
      return provenanceLedger.getTransformChain(evidence.transform_chain || []);
    },

    license: async (evidence: any) => {
      if (evidence.license) return evidence.license;
      return provenanceLedger.getLicense(evidence.license_id);
    },
  },

  Claim: {
    evidence: async (claim: any) => {
      if (claim.evidence && claim.evidence[0]?.id) {
        return claim.evidence;
      }

      const evidenceIds = claim.evidence_ids || [];
      const evidencePromises = evidenceIds.map((id: string) =>
        provenanceLedger.getEvidence(id),
      );
      const evidence = await Promise.all(evidencePromises);
      return evidence.filter((e) => e !== null);
    },

    source: async (claim: any) => {
      if (claim.source) return claim.source;
      return provenanceLedger.getSource(claim.source_id);
    },

    transform_chain: async (claim: any) => {
      if (claim.transform_chain && claim.transform_chain[0]?.id) {
        return claim.transform_chain;
      }
      return provenanceLedger.getTransformChain(claim.transform_chain || []);
    },

    license: async (claim: any) => {
      if (claim.license) return claim.license;
      return provenanceLedger.getLicense(claim.license_id);
    },

    contradicts: async (claim: any) => {
      if (!claim.contradicts || claim.contradicts.length === 0) {
        return [];
      }

      const claimPromises = claim.contradicts.map((id: string) =>
        provenanceLedger.getClaim(id),
      );
      const claims = await Promise.all(claimPromises);
      return claims.filter((c) => c !== null);
    },

    corroborates: async (claim: any) => {
      if (!claim.corroborates || claim.corroborates.length === 0) {
        return [];
      }

      const claimPromises = claim.corroborates.map((id: string) =>
        provenanceLedger.getClaim(id),
      );
      const claims = await Promise.all(claimPromises);
      return claims.filter((c) => c !== null);
    },
  },

  Transform: {
    parent_transforms: async (transform: any) => {
      if (
        !transform.parent_transforms ||
        transform.parent_transforms.length === 0
      ) {
        return [];
      }

      if (transform.parent_transforms[0]?.id) {
        return transform.parent_transforms;
      }

      return provenanceLedger.getTransformChain(
        transform.parent_transforms || [],
      );
    },
  },

  ExportManifest: {
    licenses: async (manifest: any) => {
      if (manifest.licenses && manifest.licenses[0]?.id) {
        return manifest.licenses;
      }

      const licenseIds = [
        ...new Set(
          manifest.items?.map((item: any) => item.license_id).filter(Boolean),
        ),
      ];

      const licensePromises = licenseIds.map((id: string) =>
        provenanceLedger.getLicense(id),
      );
      const licenses = await Promise.all(licensePromises);
      return licenses.filter((l) => l !== null);
    },
  },
};

export default provenanceBetaResolvers;

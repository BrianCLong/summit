/**
 * Provenance Enforcement Hooks for React UI
 *
 * These hooks ensure that the UI layer enforces provenance and governance
 * requirements by refusing to render data without proper metadata.
 *
 * SOC 2 Controls: PI1.1, PI1.4, CC6.1
 *
 * @module useProvenanceEnforcement
 */

import { useMemo, useCallback } from "react";

/**
 * Governance verdict result types matching server-side definitions
 */
export type GovernanceResult = "ALLOW" | "DENY" | "FLAG" | "REVIEW_REQUIRED";

/**
 * Governance verdict interface
 */
export interface GovernanceVerdict {
  verdictId: string;
  policyId: string;
  result: GovernanceResult;
  decidedAt: string;
  reason?: string;
  requiredApprovals?: string[];
  evaluator: string;
}

/**
 * Provenance metadata interface
 */
export interface Provenance {
  source: string;
  generatedAt: string;
  lineage: Array<{
    id: string;
    operation: string;
    inputs: string[];
    timestamp: string;
    actor?: string;
  }>;
  actor?: string;
  version?: string;
  provenanceId: string;
}

/**
 * Data classification levels
 */
export type DataClassification =
  | "PUBLIC"
  | "INTERNAL"
  | "CONFIDENTIAL"
  | "RESTRICTED"
  | "HIGHLY_RESTRICTED";

/**
 * Data envelope interface matching server-side DataEnvelope
 */
export interface DataEnvelope<T = unknown> {
  data: T;
  provenance: Provenance;
  confidence?: number;
  isSimulated: boolean;
  governanceVerdict: GovernanceVerdict;
  classification: DataClassification;
  dataHash: string;
  signature?: string;
  warnings: string[];
}

/**
 * Validation result from provenance checks
 */
export interface ProvenanceValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  canRender: boolean;
  soc2Controls: string[];
}

/**
 * Options for provenance enforcement
 */
export interface ProvenanceEnforcementOptions {
  /** Allow rendering of simulated data with warning */
  allowSimulated?: boolean;
  /** Allow rendering of flagged data with warning */
  allowFlagged?: boolean;
  /** Minimum confidence threshold for AI-generated content */
  minConfidence?: number;
  /** Classifications that require additional approval */
  restrictedClassifications?: DataClassification[];
  /** Callback when provenance validation fails */
  onValidationFail?: (errors: string[]) => void;
  /** Callback when data is simulated */
  onSimulatedData?: () => void;
}

/**
 * Validates a data envelope for provenance and governance requirements
 *
 * @param envelope - Data envelope to validate
 * @param options - Enforcement options
 * @returns Validation result
 */
export function validateEnvelope<T>(
  envelope: DataEnvelope<T> | null | undefined,
  options: ProvenanceEnforcementOptions = {}
): ProvenanceValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const soc2Controls: string[] = [];

  // Check if envelope exists
  if (!envelope) {
    errors.push("GA VIOLATION: No data envelope provided");
    soc2Controls.push("PI1.1");
    return { isValid: false, errors, warnings, canRender: false, soc2Controls };
  }

  // Check governance verdict (MANDATORY)
  if (!envelope.governanceVerdict) {
    errors.push("GA VIOLATION: Missing governance verdict - CC6.1, CC7.2");
    soc2Controls.push("CC6.1", "CC7.2");
  } else {
    // Validate verdict structure
    if (!envelope.governanceVerdict.verdictId) {
      errors.push("Missing verdict ID");
    }
    if (!envelope.governanceVerdict.result) {
      errors.push("Missing verdict result");
    }

    // Check verdict result
    if (envelope.governanceVerdict.result === "DENY") {
      errors.push(`Access denied: ${envelope.governanceVerdict.reason || "Policy violation"}`);
    }

    if (envelope.governanceVerdict.result === "REVIEW_REQUIRED") {
      errors.push("Data requires approval before display");
    }

    if (envelope.governanceVerdict.result === "FLAG") {
      if (!options.allowFlagged) {
        errors.push("Flagged data display not permitted");
      } else {
        warnings.push("This data has been flagged for review");
      }
    }
  }

  // Check provenance (MANDATORY)
  if (!envelope.provenance) {
    errors.push("GA VIOLATION: Missing provenance - PI1.1");
    soc2Controls.push("PI1.1");
  } else {
    if (!envelope.provenance.source) {
      errors.push("Missing provenance source");
    }
    if (!envelope.provenance.provenanceId) {
      errors.push("Missing provenance ID");
    }
  }

  // Check isSimulated flag (MANDATORY)
  if (envelope.isSimulated === undefined || envelope.isSimulated === null) {
    errors.push("GA VIOLATION: Missing isSimulated flag - PI1.1");
    soc2Controls.push("PI1.1");
  } else if (envelope.isSimulated) {
    if (!options.allowSimulated) {
      errors.push("Simulated data display not permitted");
    } else {
      warnings.push("⚠️ This is simulated data - not for production use");
    }
  }

  // Check classification
  const restrictedClassifications = options.restrictedClassifications || [
    "RESTRICTED",
    "HIGHLY_RESTRICTED",
  ];
  if (restrictedClassifications.includes(envelope.classification)) {
    warnings.push(`High classification: ${envelope.classification}`);
  }

  // Check confidence for AI content
  if (envelope.confidence !== undefined && envelope.confidence !== null) {
    const minConfidence = options.minConfidence ?? 0.5;
    if (envelope.confidence < minConfidence) {
      warnings.push(`Low confidence AI output: ${Math.round(envelope.confidence * 100)}%`);
    }
  }

  // Check data hash
  if (!envelope.dataHash) {
    errors.push("Missing data hash - PI1.4");
    soc2Controls.push("PI1.4");
  }

  // Add envelope warnings
  if (envelope.warnings && envelope.warnings.length > 0) {
    warnings.push(...envelope.warnings);
  }

  const isValid = errors.length === 0;
  const canRender = isValid || (errors.length === 0 && warnings.length > 0);

  return {
    isValid,
    errors,
    warnings,
    canRender,
    soc2Controls: [...new Set(soc2Controls)],
  };
}

/**
 * Hook for provenance enforcement in React components
 *
 * Validates data envelopes and prevents rendering of data without
 * proper provenance and governance metadata.
 *
 * @example
 * ```tsx
 * function EntityDisplay({ envelope }: { envelope: DataEnvelope<Entity> }) {
 *   const { data, validation, ProvenanceIndicator } = useProvenanceEnforcement(envelope);
 *
 *   if (!validation.canRender) {
 *     return <ProvenanceError errors={validation.errors} />;
 *   }
 *
 *   return (
 *     <div>
 *       <ProvenanceIndicator />
 *       <EntityCard data={data} />
 *     </div>
 *   );
 * }
 * ```
 */
export function useProvenanceEnforcement<T>(
  envelope: DataEnvelope<T> | null | undefined,
  options: ProvenanceEnforcementOptions = {}
) {
  // Validate envelope
  const validation = useMemo(() => validateEnvelope(envelope, options), [envelope, options]);

  // Call callbacks
  useMemo(() => {
    if (!validation.isValid && options.onValidationFail) {
      options.onValidationFail(validation.errors);
    }
    if (envelope?.isSimulated && options.onSimulatedData) {
      options.onSimulatedData();
    }
  }, [validation, envelope?.isSimulated, options]);

  // Extract data (only if valid)
  const data = useMemo(() => {
    if (!validation.canRender || !envelope) {
      return null;
    }
    return envelope.data;
  }, [validation.canRender, envelope]);

  // Provenance summary for display
  const provenanceSummary = useMemo(() => {
    if (!envelope?.provenance) return null;

    return {
      source: envelope.provenance.source,
      generatedAt: envelope.provenance.generatedAt,
      provenanceId: envelope.provenance.provenanceId,
      lineageDepth: envelope.provenance.lineage.length,
    };
  }, [envelope?.provenance]);

  // Governance summary for display
  const governanceSummary = useMemo(() => {
    if (!envelope?.governanceVerdict) return null;

    return {
      verdict: envelope.governanceVerdict.result,
      policyId: envelope.governanceVerdict.policyId,
      decidedAt: envelope.governanceVerdict.decidedAt,
      evaluator: envelope.governanceVerdict.evaluator,
    };
  }, [envelope?.governanceVerdict]);

  // Check if data requires warning display
  const requiresWarning = useMemo(() => {
    return (
      envelope?.isSimulated ||
      envelope?.governanceVerdict?.result === "FLAG" ||
      (envelope?.confidence !== undefined && envelope.confidence < 0.8)
    );
  }, [envelope]);

  return {
    data,
    validation,
    provenanceSummary,
    governanceSummary,
    requiresWarning,
    isSimulated: envelope?.isSimulated ?? false,
    classification: envelope?.classification,
    confidence: envelope?.confidence,
    warnings: validation.warnings,
  };
}

/**
 * Hook to require governance verdict before allowing actions
 *
 * Use this to gate user actions (e.g., export, share) on governance approval.
 */
export function useGovernanceGate<T>(envelope: DataEnvelope<T> | null | undefined) {
  const isAllowed = useMemo(() => {
    if (!envelope?.governanceVerdict) return false;
    return envelope.governanceVerdict.result === "ALLOW";
  }, [envelope]);

  const isFlagged = useMemo(() => {
    return envelope?.governanceVerdict?.result === "FLAG";
  }, [envelope]);

  const isDenied = useMemo(() => {
    return envelope?.governanceVerdict?.result === "DENY";
  }, [envelope]);

  const requiresApproval = useMemo(() => {
    return envelope?.governanceVerdict?.result === "REVIEW_REQUIRED";
  }, [envelope]);

  const requiredApprovers = useMemo(() => {
    return envelope?.governanceVerdict?.requiredApprovals ?? [];
  }, [envelope]);

  const denyReason = useMemo(() => {
    if (envelope?.governanceVerdict?.result === "DENY") {
      return envelope.governanceVerdict.reason ?? "Policy violation";
    }
    return null;
  }, [envelope]);

  return {
    isAllowed,
    isFlagged,
    isDenied,
    requiresApproval,
    requiredApprovers,
    denyReason,
  };
}

/**
 * Hook to track and display provenance chain
 *
 * Use this to show data lineage in the UI.
 */
export function useProvenanceChain<T>(envelope: DataEnvelope<T> | null | undefined) {
  const chain = useMemo(() => {
    if (!envelope?.provenance?.lineage) return [];

    return envelope.provenance.lineage.map((node, index) => ({
      step: index + 1,
      operation: node.operation,
      timestamp: node.timestamp,
      actor: node.actor ?? "System",
      inputs: node.inputs,
    }));
  }, [envelope]);

  const sourceInfo = useMemo(() => {
    if (!envelope?.provenance) return null;

    return {
      source: envelope.provenance.source,
      generatedAt: envelope.provenance.generatedAt,
      actor: envelope.provenance.actor ?? "Unknown",
      version: envelope.provenance.version,
    };
  }, [envelope]);

  return {
    chain,
    sourceInfo,
    totalSteps: chain.length,
    hasLineage: chain.length > 0,
  };
}

/**
 * Hook to enforce simulation mode restrictions
 *
 * Prevents certain actions on simulated data.
 */
export function useSimulationGuard<T>(envelope: DataEnvelope<T> | null | undefined) {
  const isSimulated = envelope?.isSimulated ?? true; // Default to simulated for safety

  const canExport = useCallback(() => {
    if (isSimulated) {
      console.warn("GA ENFORCEMENT: Cannot export simulated data");
      return false;
    }
    return true;
  }, [isSimulated]);

  const canShare = useCallback(() => {
    if (isSimulated) {
      console.warn("GA ENFORCEMENT: Cannot share simulated data");
      return false;
    }
    return true;
  }, [isSimulated]);

  const canCite = useCallback(() => {
    if (isSimulated) {
      console.warn("GA ENFORCEMENT: Simulated data cannot be cited");
      return false;
    }
    return true;
  }, [isSimulated]);

  return {
    isSimulated,
    canExport,
    canShare,
    canCite,
    warningMessage: isSimulated
      ? "This is simulated data and cannot be used for production decisions"
      : null,
  };
}

export default {
  useProvenanceEnforcement,
  useGovernanceGate,
  useProvenanceChain,
  useSimulationGuard,
  validateEnvelope,
};

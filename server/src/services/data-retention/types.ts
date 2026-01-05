export interface PurgeTarget {
  resourceType: string;
  selector: string;
  retentionPolicy: string;
  reason: string;
  classification?: string[];
}

export interface PurgeWindow {
  start: string;
  end: string;
}

export interface PurgeRequest {
  purgeId?: string;
  tenantId: string;
  actorId: string;
  purpose: string;
  window: PurgeWindow;
  dryRun?: boolean;
  requestedAt?: string;
  policyDecisionId?: string;
  targets: PurgeTarget[];
}

export interface PurgeExecutionContext {
  purgeId: string;
  tenantId: string;
  actorId: string;
  purpose: string;
  window: PurgeWindow;
  dryRun: boolean;
  requestedAt: string;
  policyDecisionId?: string;
}

export interface PurgeExecutionResult {
  target: PurgeTarget;
  deletedCount: number;
  sampledIds?: string[];
}

export interface PurgeExecutor {
  purge(
    target: PurgeTarget,
    context: PurgeExecutionContext,
  ): Promise<PurgeExecutionResult>;
}

export interface PurgeReceiptReference {
  receiptId: string;
  receiptSignature: string;
  signerKeyId: string;
}

export interface PurgeManifestTarget {
  resourceType: string;
  selector: string;
  retentionPolicy: string;
  reason: string;
  classification?: string[];
  deletedCount: number;
  sampledIdsHash?: string;
}

export interface PurgeManifest {
  version: string;
  purgeId: string;
  tenantId: string;
  actorId: string;
  purpose: string;
  requestedAt: string;
  executedAt: string;
  window: PurgeWindow;
  dryRun: boolean;
  targets: PurgeManifestTarget[];
  totals: {
    deletedCount: number;
    targetCount: number;
  };
  policyDecisionId?: string;
  receipt: PurgeReceiptReference;
  manifestHash: string;
  signature: string;
  signerKeyId: string;
}

export interface PurgeDisclosureBundle {
  bundleId: string;
  createdAt: string;
  tenantId: string;
  purpose: string;
  window: PurgeWindow;
  resourceTypes: string[];
  totals: {
    deletedCount: number;
    targetCount: number;
  };
  manifestHash: string;
  receiptId: string;
  signature: string;
  signerKeyId: string;
}

export interface PurgeWorkflowResult {
  manifest: PurgeManifest;
  receipt: PurgeReceiptReference;
  disclosureBundle: PurgeDisclosureBundle;
  results: PurgeExecutionResult[];
}

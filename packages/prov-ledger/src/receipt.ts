import { hashJson, recordStep, type ProvenanceManifest, type ProvenanceStep } from "./primitives";

export interface DecisionReceipt {
  id: string;
  action: string;
  decision: string;
  retries: number;
  digests: {
    subject: string;
    resource: string;
    context: string;
  };
  issuedAt: string;
  adapterId?: string;
  obligations?: unknown[];
}

export interface ReceiptOptions {
  manifest: ProvenanceManifest;
  adapterId?: string;
  action: string;
  decision: string;
  subject: unknown;
  resource: unknown;
  context: unknown;
  retries?: number;
  obligations?: unknown[];
  stepId?: string;
  tool?: string;
  note?: string;
}

export function emitDecisionReceipt(options: ReceiptOptions): {
  receipt: DecisionReceipt;
  step: ProvenanceStep;
} {
  const retries = options.retries ?? 0;
  const id =
    options.stepId || `decision-${options.adapterId ? `${options.adapterId}-` : ""}${Date.now()}`;

  const receipt: DecisionReceipt = {
    id,
    action: options.action,
    decision: options.decision,
    retries,
    obligations: options.obligations,
    digests: {
      subject: hashJson(options.subject),
      resource: hashJson(options.resource),
      context: hashJson(options.context),
    },
    adapterId: options.adapterId,
    issuedAt: new Date().toISOString(),
  };

  const step = recordStep(options.manifest, {
    id,
    type: "policy-check",
    tool: options.tool || "decision-receipt",
    params: {
      action: options.action,
      decision: options.decision,
      retries,
      adapterId: options.adapterId,
      obligations: options.obligations,
    },
    input: JSON.stringify({
      subject: options.subject,
      resource: options.resource,
      context: options.context,
    }),
    output: JSON.stringify(receipt),
    note: options.note,
  });

  return { receipt, step };
}

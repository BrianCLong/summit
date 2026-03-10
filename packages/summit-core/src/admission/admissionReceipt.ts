import { createHmac } from "node:crypto";
import type { LedgerJournalEntry } from "./ledgerStore";

export interface AdmissionReceipt {
  receipt_id: string;
  writeset_id: string;
  batch_signature: string;
  admitted_at: string;
  admission_version: string;
  validator_hash: string;
  journal_sequence: number;
  receipt_signature: string;
  receipt_payload_hash: string;
}

export interface ReceiptSigningConfig {
  secret: string;
  key_id: string;
}

export function computeReceiptPayloadHash(payload: Omit<AdmissionReceipt, "receipt_signature">): string {
  const canonical = JSON.stringify({
    receipt_id: payload.receipt_id,
    writeset_id: payload.writeset_id,
    batch_signature: payload.batch_signature,
    admitted_at: payload.admitted_at,
    admission_version: payload.admission_version,
    validator_hash: payload.validator_hash,
    journal_sequence: payload.journal_sequence,
  });
  return createHmac("sha256", "receipt-payload-hash").update(canonical, "utf8").digest("hex");
}

export function signAdmissionReceipt(
  payload: Omit<AdmissionReceipt, "receipt_signature" | "receipt_payload_hash">,
  signing: ReceiptSigningConfig,
): AdmissionReceipt {
  const unsigned: Omit<AdmissionReceipt, "receipt_signature"> = {
    ...payload,
    receipt_payload_hash: computeReceiptPayloadHash({
      ...payload,
      receipt_signature: "",
      receipt_payload_hash: "",
    } as Omit<AdmissionReceipt, "receipt_signature">),
  };

  const toSign = JSON.stringify({
    key_id: signing.key_id,
    ...unsigned,
  });

  const receipt_signature = createHmac("sha256", signing.secret).update(toSign, "utf8").digest("hex");

  return {
    ...unsigned,
    receipt_signature,
  };
}

export function verifyAdmissionReceipt(
  receipt: AdmissionReceipt,
  signing: ReceiptSigningConfig,
): boolean {
  const expected = signAdmissionReceipt(
    {
      receipt_id: receipt.receipt_id,
      writeset_id: receipt.writeset_id,
      batch_signature: receipt.batch_signature,
      admitted_at: receipt.admitted_at,
      admission_version: receipt.admission_version,
      validator_hash: receipt.validator_hash,
      journal_sequence: receipt.journal_sequence,
    },
    signing,
  );

  return (
    expected.receipt_signature === receipt.receipt_signature &&
    expected.receipt_payload_hash === receipt.receipt_payload_hash
  );
}

export function receiptIdFromJournal(entry: LedgerJournalEntry): string {
  return `rcpt-${entry.sequence.toString().padStart(10, "0")}`;
}

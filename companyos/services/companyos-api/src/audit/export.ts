import { AuditBus } from "./bus";
import { signEvent } from "./signer";
import { randomUUID } from "crypto";

export interface AuditExportPack {
  id: string;
  tenant_id: string;
  generated_at: string;
  events: any[];
  integrity_signature: string;
}

export async function generateAuditExport(tenantId: string): Promise<AuditExportPack> {
  const bus = AuditBus.getInstance();
  const events = await bus.query(tenantId);

  const pack: Omit<AuditExportPack, "integrity_signature"> = {
    id: randomUUID(),
    tenant_id: tenantId,
    generated_at: new Date().toISOString(),
    events,
  };

  // We reuse the same signing logic for the whole pack
  const signedPack = signEvent(pack as any) as any;

  return {
    ...pack,
    integrity_signature: signedPack.signature,
  };
}

import { EvidenceEnvelope } from '../../evidence/schema/evidenceEnvelope';

export interface SAPEvidencePacket {
  envelope: EvidenceEnvelope;
}

export function toSepEvidencePacket(envelope: EvidenceEnvelope): SAPEvidencePacket {
  return { envelope };
}

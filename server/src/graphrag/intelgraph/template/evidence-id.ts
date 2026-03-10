import { v4 as uuidv4 } from 'uuid';

export function generateEvidenceId(pattern: string = 'IG-EVID-######'): string {
  // A simplistic mock generator.
  const randomStr = Math.floor(Math.random() * 1000000).toString().padStart(6, '0');
  return pattern.replace('######', randomStr);
}

export type EvidenceId = string;

import nacl from 'tweetnacl';
import { createHash } from 'crypto';

export interface Participant {
  id: string;
  attributes: Record<string, string>;
  eligible?: boolean;
}

export interface StratificationPlan {
  keys: string[];
  targets: Record<string, number>;
}

export interface SelectedParticipant {
  id: string;
  stratum: string;
  randomness: string;
  proof: string;
}

export interface ParticipantRandomness extends SelectedParticipant {
  excluded?: boolean;
}

export interface StratumBalance {
  target: number;
  selected: number;
  available: number;
}

export interface SamplingCertificate {
  seed: string;
  publicKey: string;
  plan: StratificationPlan;
  strata: Record<string, StratumBalance>;
  exclusions: string[];
  cohort: SelectedParticipant[];
  transcript: ParticipantRandomness[];
  timestamp: string;
  hash: string;
}

function stratify(plan: StratificationPlan, participant: Participant): string {
  if (!plan.keys?.length) {
    throw new Error('stratification plan requires keys');
  }
  return plan.keys
    .map((key) => {
      const value = participant.attributes?.[key];
      if (value === undefined) {
        throw new Error(
          `participant ${participant.id} missing attribute ${key}`,
        );
      }
      return `${key}=${value}`;
    })
    .join('|');
}

function decodeHex(input: string): Uint8Array {
  if (input.length % 2 !== 0) {
    throw new Error('hex input must have even length');
  }
  const out = new Uint8Array(input.length / 2);
  for (let i = 0; i < out.length; i += 1) {
    const byte = parseInt(input.slice(i * 2, i * 2 + 2), 16);
    if (Number.isNaN(byte)) {
      throw new Error('invalid hex input');
    }
    out[i] = byte;
  }
  return out;
}

function verifyProof(
  publicKey: string,
  message: Uint8Array,
  proof: string,
  randomness: string,
): void {
  const key = Uint8Array.from(Buffer.from(publicKey, 'base64'));
  if (key.length !== nacl.sign.publicKeyLength) {
    throw new Error('invalid public key size');
  }
  const proofBytes = Uint8Array.from(Buffer.from(proof, 'base64'));
  if (!nacl.sign.detached.verify(message, proofBytes, key)) {
    throw new Error('invalid proof');
  }
  const digest = createHash('sha256')
    .update(Buffer.from(proofBytes))
    .digest('hex');
  if (digest !== randomness) {
    throw new Error('randomness mismatch');
  }
}

export function verifyCertificate(
  participants: Participant[],
  certificate: SamplingCertificate,
): void {
  const plan = certificate.plan;
  if (!plan?.keys?.length) {
    throw new Error('invalid stratification plan');
  }
  const seed = decodeHex(certificate.seed);
  const participantMap = new Map<string, Participant>();
  for (const raw of participants) {
    if (!raw.id) {
      throw new Error('participant id missing');
    }
    participantMap.set(raw.id, raw);
  }
  const transcriptById = new Map<string, ParticipantRandomness>();
  const buckets = new Map<string, SelectedParticipant[]>();
  const exclusions = new Set<string>(certificate.exclusions ?? []);

  for (const entry of certificate.transcript) {
    const participant = participantMap.get(entry.id);
    if (!participant) {
      throw new Error(`unknown participant ${entry.id}`);
    }
    const expectedStratum = stratify(plan, participant);
    if (expectedStratum !== entry.stratum) {
      throw new Error(`stratum mismatch for ${entry.id}`);
    }
    const message = new Uint8Array(seed.length + entry.id.length);
    message.set(seed);
    message.set(Buffer.from(entry.id), seed.length);
    verifyProof(certificate.publicKey, message, entry.proof, entry.randomness);
    transcriptById.set(entry.id, entry);
    if (entry.excluded || exclusions.has(entry.id)) {
      continue;
    }
    const bucket = buckets.get(entry.stratum) ?? [];
    bucket.push({
      id: entry.id,
      stratum: entry.stratum,
      randomness: entry.randomness,
      proof: entry.proof,
    });
    buckets.set(entry.stratum, bucket);
  }

  for (const [stratum, bucket] of buckets.entries()) {
    bucket.sort((a, b) => {
      if (a.randomness === b.randomness) {
        return a.id.localeCompare(b.id);
      }
      return a.randomness.localeCompare(b.randomness);
    });
  }

  const derived: SelectedParticipant[] = [];
  for (const [stratum, target] of Object.entries(plan.targets ?? {})) {
    const bucket = buckets.get(stratum) ?? [];
    if (bucket.length < target) {
      throw new Error(`insufficient participants for ${stratum}`);
    }
    derived.push(...bucket.slice(0, target));
  }

  derived.sort((a, b) => {
    if (a.stratum === b.stratum) {
      if (a.randomness === b.randomness) {
        return a.id.localeCompare(b.id);
      }
      return a.randomness.localeCompare(b.randomness);
    }
    return a.stratum.localeCompare(b.stratum);
  });

  if (derived.length !== certificate.cohort.length) {
    throw new Error('cohort size mismatch');
  }
  for (let i = 0; i < derived.length; i += 1) {
    const expected = derived[i];
    const actual = certificate.cohort[i];
    if (
      expected.id !== actual.id ||
      expected.stratum !== actual.stratum ||
      expected.randomness !== actual.randomness
    ) {
      throw new Error(`cohort mismatch at index ${i}`);
    }
  }
}

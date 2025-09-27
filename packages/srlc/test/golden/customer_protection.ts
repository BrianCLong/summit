import { createHash } from 'node:crypto';

export type SrlcRecord = Record<string, unknown>;

type NullableString = string | null;

function assertFormat(value: NullableString, format: string): void {
  if (value == null) {
    return;
  }
  const patterns: Record<string, RegExp> = {
    ssn: /^[0-9]{3}-?[0-9]{2}-?[0-9]{4}$/,
    iban: /^[A-Z0-9]{15,34}$/,
    phone: /^\+?[0-9]{10,15}$/,
  };
  const pattern = patterns[format];
  if (pattern && !pattern.test(value)) {
    throw new Error(`SRLC format violation for ${format}: ${value}`);
  }
}

function mask(value: NullableString, keep: number, maskChar: string, format: string): NullableString {
  if (value == null) {
    return value;
  }
  assertFormat(value, format);
  if (keep <= 0) {
    return value.replace(/[A-Za-z0-9]/g, maskChar);
  }
  let visible = 0;
  let result = '';
  for (let idx = value.length - 1; idx >= 0; idx -= 1) {
    const ch = value[idx];
    if (/[A-Za-z0-9]/.test(ch)) {
      if (visible < keep) {
        result = ch + result;
        visible += 1;
      } else {
        result = maskChar + result;
      }
    } else {
      result = ch + result;
    }
  }
  return result;
}

function hash(value: NullableString, algorithm: 'sha256' | 'sha512', saltScope: string): NullableString {
  if (value == null) {
    return value;
  }
  const salt = saltScope === 'global' ? 'SRLC_GLOBAL' : 'SRLC_SESSION';
  return createHash(algorithm).update(value + salt).digest('hex');
}

function tokenize(value: NullableString, namespace: string, preserveFormat: boolean, format: string): NullableString {
  if (value == null) {
    return value;
  }
  assertFormat(value, format);
  const token = createHash('sha256').update(`${namespace}:${value}`).digest('hex');
  return preserveFormat ? token.slice(0, value.length) : token;
}

function generalize(value: NullableString, granularity: string): NullableString {
  if (value == null) {
    return value;
  }
  if (granularity === 'none') {
    return value;
  }
  return `${granularity}::${value}`;
}

export const helpers = {
  assertFormat,
  mask,
  hash,
  tokenize,
  generalize
};

export function applyCustomerProtectionRedactions(record: SrlcRecord): SrlcRecord {
  const next: SrlcRecord = { ...record };

  {
    const original = record['customer.ssn'];
    let current0: NullableString = original == null ? null : String(original);
    current0 = mask(current0, 4, '#', 'ssn');
    current0 = hash(current0, 'sha256', 'session');
    next['customer.ssn'] = current0;
    // customer.ssn:mask(format=ssn,keep=4,char=#) |> hash(format=ssn,algorithm=sha256,salt=session)
  }

  {
    const original = record['account.iban'];
    let current1: NullableString = original == null ? null : String(original);
    current1 = tokenize(current1, 'payments', true, 'iban');
    next['account.iban'] = current1;
    // account.iban:tokenize(format=iban,namespace=payments,preserveFormat=true)
  }

  {
    const original = record['contact.phone'];
    let current2: NullableString = original == null ? null : String(original);
    current2 = mask(current2, 4, '#', 'phone');
    current2 = generalize(current2, 'region');
    next['contact.phone'] = current2;
    // contact.phone:mask(format=phone,keep=4,char=#) |> generalize(format=phone,granularity=region)
  }

  return next;
}
const NEVER_LOG_FIELDS = [
  'street_address',
  'phone_number',
  'personal_email',
  'private_message_contents',
  'minor_identifier',
  'weapon_access_instructions',
  'medical_claim',
  'protected_class',
];

export function redactPayload(payload: Record<string, unknown>) {
  const copy = { ...payload };
  for (const field of NEVER_LOG_FIELDS) {
    if (field in copy) {
      copy[field] = '[REDACTED]';
    }
  }
  return copy;
}

export function hasForbiddenScoringFields(payload: Record<string, unknown>): boolean {
  return ['demographics', 'ideology', 'diagnosis', 'nationality', 'religion', 'disability']
    .some((field) => field in payload);
}

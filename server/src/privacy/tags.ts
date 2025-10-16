export type PTag = 'PII' | 'SENSITIVE' | 'PUBLIC';
export const schemaTags: Record<string, PTag> = {
  'users.email': 'PII',
  'users.ssn': 'SENSITIVE',
  'events.name': 'PUBLIC',
};

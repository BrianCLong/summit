export type CanonicalField = {
  id: string;
  label: string;
  type: 'string' | 'number' | 'date' | 'boolean';
  required?: boolean;
  piiCategory?: 'name' | 'contact' | 'identifier' | 'location' | 'none';
  description: string;
  synonyms: string[];
  policies?: string[];
};

export type CanonicalEntity = {
  id: string;
  label: string;
  description: string;
  fields: CanonicalField[];
};

const PERSON_FIELDS: CanonicalField[] = [
  {
    id: 'person.fullName',
    label: 'Full Name',
    type: 'string',
    required: true,
    piiCategory: 'name',
    description: 'Complete name of the individual',
    synonyms: ['name', 'full_name', 'fullname', 'person_name'],
    policies: ['pii:moderate'],
  },
  {
    id: 'person.email',
    label: 'Email',
    type: 'string',
    piiCategory: 'contact',
    description: 'Primary email address',
    synonyms: ['email', 'email_address', 'mail'],
    policies: ['pii:moderate'],
  },
  {
    id: 'person.phone',
    label: 'Phone Number',
    type: 'string',
    piiCategory: 'contact',
    description: 'Primary phone number',
    synonyms: ['phone', 'phone_number', 'mobile', 'tel'],
    policies: ['pii:moderate'],
  },
  {
    id: 'person.nationalId',
    label: 'National Identifier',
    type: 'string',
    piiCategory: 'identifier',
    description: 'Government issued identifier such as SSN',
    synonyms: ['ssn', 'social_security', 'national_id'],
    policies: ['pii:restricted', 'requires-redaction'],
  },
  {
    id: 'person.organization',
    label: 'Affiliated Organization',
    type: 'string',
    description: 'Organization the individual is associated with',
    synonyms: ['company', 'org', 'employer', 'organization'],
  },
  {
    id: 'person.role',
    label: 'Role / Title',
    type: 'string',
    description: 'Role or job title of the individual',
    synonyms: ['title', 'job_title', 'role', 'position'],
  },
  {
    id: 'person.location',
    label: 'Location',
    type: 'string',
    piiCategory: 'location',
    description: 'Location associated with the individual',
    synonyms: ['city', 'location', 'address'],
    policies: ['pii:moderate'],
  },
];

const ORGANIZATION_FIELDS: CanonicalField[] = [
  {
    id: 'org.name',
    label: 'Organization Name',
    type: 'string',
    required: true,
    description: 'Canonical name of the organization',
    synonyms: ['company', 'organization', 'org_name'],
  },
  {
    id: 'org.domain',
    label: 'Web Domain',
    type: 'string',
    description: 'Primary web domain for the organization',
    synonyms: ['domain', 'website', 'url'],
  },
  {
    id: 'org.industry',
    label: 'Industry',
    type: 'string',
    description: 'Industry classification',
    synonyms: ['industry', 'sector'],
  },
  {
    id: 'org.hqLocation',
    label: 'Headquarters Location',
    type: 'string',
    description: 'Location of headquarters',
    synonyms: ['hq', 'headquarters', 'hq_location'],
  },
];

const EVENT_FIELDS: CanonicalField[] = [
  {
    id: 'event.name',
    label: 'Event Name',
    type: 'string',
    required: true,
    description: 'Canonical title of the event',
    synonyms: ['event', 'event_name', 'incident'],
  },
  {
    id: 'event.occurredAt',
    label: 'Occurrence Date',
    type: 'date',
    description: 'Date when the event occurred',
    synonyms: ['date', 'occurred_at', 'timestamp', 'event_date'],
  },
  {
    id: 'event.location',
    label: 'Event Location',
    type: 'string',
    description: 'Location of the event',
    synonyms: ['location', 'venue', 'event_location'],
    piiCategory: 'location',
  },
  {
    id: 'event.severity',
    label: 'Severity',
    type: 'string',
    description: 'Severity level for the event',
    synonyms: ['severity', 'priority'],
  },
];

export const CANONICAL_ENTITIES: CanonicalEntity[] = [
  {
    id: 'person',
    label: 'Person',
    description: 'Canonical person entity capturing individuals',
    fields: PERSON_FIELDS,
  },
  {
    id: 'organization',
    label: 'Organization',
    description: 'Canonical organization entity',
    fields: ORGANIZATION_FIELDS,
  },
  {
    id: 'event',
    label: 'Event',
    description: 'Canonical event entity',
    fields: EVENT_FIELDS,
  },
];

export function findCanonicalFieldById(fieldId: string): CanonicalField | undefined {
  for (const entity of CANONICAL_ENTITIES) {
    const match = entity.fields.find((field) => field.id === fieldId);
    if (match) return match;
  }
  return undefined;
}

export function findCanonicalEntity(entityId: string): CanonicalEntity | undefined {
  return CANONICAL_ENTITIES.find((entity) => entity.id === entityId);
}

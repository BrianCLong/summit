export interface RelationshipConstraint {
  source: string;
  target: string;
}

export interface RelationshipProperty {
  name: string;
  required: boolean;
  type?: 'string' | 'number' | 'boolean' | 'date';
}

export interface RelationshipTypeConfig {
  name: string;
  category: string;
  description: string;
  properties: RelationshipProperty[];
  constraints: RelationshipConstraint[];
  weight: number;
}

export const RELATIONSHIP_SCHEMA: Record<string, RelationshipTypeConfig> = {
  // Personal relationships
  FAMILY: {
    name: 'FAMILY',
    category: 'PERSONAL',
    description: 'Family relationship',
    properties: [
      { name: 'relationship_type', required: false },
      { name: 'since', required: false },
      { name: 'degree', required: false },
    ],
    constraints: [{ source: 'Person', target: 'Person' }],
    weight: 0.9,
  },
  FRIEND: {
    name: 'FRIEND',
    category: 'PERSONAL',
    description: 'Friendship relationship',
    properties: [
      { name: 'since', required: false },
      { name: 'closeness', required: false },
      { name: 'frequency', required: false },
    ],
    constraints: [{ source: 'Person', target: 'Person' }],
    weight: 0.7,
  },
  ROMANTIC: {
    name: 'ROMANTIC',
    category: 'PERSONAL',
    description: 'Romantic relationship',
    properties: [
      { name: 'status', required: false },
      { name: 'since', required: false },
      { name: 'until', required: false },
    ],
    constraints: [{ source: 'Person', target: 'Person' }],
    weight: 0.9,
  },

  // Professional relationships
  EMPLOYMENT: {
    name: 'EMPLOYMENT',
    category: 'PROFESSIONAL',
    description: 'Employment relationship',
    properties: [
      { name: 'position', required: false },
      { name: 'department', required: false },
      { name: 'since', required: false },
      { name: 'until', required: false },
      { name: 'salary', required: false },
    ],
    constraints: [{ source: 'Person', target: 'Organization' }],
    weight: 0.8,
  },
  PARTNERSHIP: {
    name: 'PARTNERSHIP',
    category: 'PROFESSIONAL',
    description: 'Business partnership',
    properties: [
      { name: 'type', required: false },
      { name: 'since', required: false },
      { name: 'equity_share', required: false },
      { name: 'role', required: false },
    ],
    constraints: [
      { source: 'Person', target: 'Organization' },
      { source: 'Organization', target: 'Organization' },
    ],
    weight: 0.8,
  },
  LEADERSHIP: {
    name: 'LEADERSHIP',
    category: 'PROFESSIONAL',
    description: 'Leadership or management relationship',
    properties: [
      { name: 'title', required: false },
      { name: 'since', required: false },
      { name: 'reports_count', required: false },
    ],
    constraints: [
      { source: 'Person', target: 'Organization' },
      { source: 'Person', target: 'Person' },
    ],
    weight: 0.9,
  },
  BOARD_MEMBER: {
    name: 'BOARD_MEMBER',
    category: 'PROFESSIONAL',
    description: 'Board membership',
    properties: [
      { name: 'since', required: false },
      { name: 'committee', required: false },
      { name: 'compensation', required: false },
    ],
    constraints: [{ source: 'Person', target: 'Organization' }],
    weight: 0.7,
  },

  // Financial relationships
  OWNERSHIP: {
    name: 'OWNERSHIP',
    category: 'FINANCIAL',
    description: 'Ownership relationship',
    properties: [
      { name: 'percentage', required: false },
      { name: 'since', required: false },
      { name: 'type', required: false },
      { name: 'value', required: false },
    ],
    constraints: [
      { source: 'Person', target: 'Organization' },
      { source: 'Person', target: 'Asset' },
      { source: 'Organization', target: 'Asset' },
    ],
    weight: 0.9,
  },
  INVESTMENT: {
    name: 'INVESTMENT',
    category: 'FINANCIAL',
    description: 'Investment relationship',
    properties: [
      { name: 'amount', required: false },
      { name: 'date', required: false },
      { name: 'type', required: false },
      { name: 'return_rate', required: false },
    ],
    constraints: [
      { source: 'Person', target: 'Organization' },
      { source: 'Organization', target: 'Organization' },
    ],
    weight: 0.6,
  },
  LOAN: {
    name: 'LOAN',
    category: 'FINANCIAL',
    description: 'Loan relationship',
    properties: [
      { name: 'amount', required: false },
      { name: 'interest_rate', required: false },
      { name: 'term', required: false },
      { name: 'status', required: false },
    ],
    constraints: [
      { source: 'Person', target: 'Person' },
      { source: 'Person', target: 'Organization' },
      { source: 'Organization', target: 'Organization' },
    ],
    weight: 0.7,
  },
  TRANSACTION: {
    name: 'TRANSACTION',
    category: 'FINANCIAL',
    description: 'Financial transaction',
    properties: [
      { name: 'amount', required: false },
      { name: 'date', required: false },
      { name: 'currency', required: false },
      { name: 'purpose', required: false },
    ],
    constraints: [
      { source: 'Person', target: 'Person' },
      { source: 'Person', target: 'Organization' },
      { source: 'Organization', target: 'Organization' },
    ],
    weight: 0.5,
  },

  // Communication relationships
  COMMUNICATION: {
    name: 'COMMUNICATION',
    category: 'COMMUNICATION',
    description: 'Communication relationship',
    properties: [
      { name: 'method', required: false },
      { name: 'frequency', required: false },
      { name: 'last_contact', required: false },
      { name: 'duration', required: false },
    ],
    constraints: [
      { source: 'Person', target: 'Person' },
      { source: 'Person', target: 'Organization' },
    ],
    weight: 0.4,
  },
  EMAIL: {
    name: 'EMAIL',
    category: 'COMMUNICATION',
    description: 'Email communication',
    properties: [
      { name: 'subject', required: false },
      { name: 'date', required: false },
      { name: 'direction', required: false },
      { name: 'attachment_count', required: false },
    ],
    constraints: [
      { source: 'Person', target: 'Person' },
      { source: 'Person', target: 'Organization' },
    ],
    weight: 0.3,
  },
  PHONE_CALL: {
    name: 'PHONE_CALL',
    category: 'COMMUNICATION',
    description: 'Phone communication',
    properties: [
      { name: 'duration', required: false },
      { name: 'date', required: false },
      { name: 'direction', required: false },
      { name: 'call_type', required: false },
    ],
    constraints: [{ source: 'Person', target: 'Person' }],
    weight: 0.4,
  },
  MEETING: {
    name: 'MEETING',
    category: 'COMMUNICATION',
    description: 'Meeting or encounter',
    properties: [
      { name: 'date', required: false },
      { name: 'location', required: false },
      { name: 'duration', required: false },
      { name: 'purpose', required: false },
    ],
    constraints: [
      { source: 'Person', target: 'Person' },
      { source: 'Person', target: 'Organization' },
    ],
    weight: 0.6,
  },

  // Location relationships
  LOCATED_AT: {
    name: 'LOCATED_AT',
    category: 'LOCATION',
    description: 'Location relationship',
    properties: [
      { name: 'since', required: false },
      { name: 'until', required: false },
      { name: 'address', required: false },
      { name: 'type', required: false },
    ],
    constraints: [
      { source: 'Person', target: 'Location' },
      { source: 'Organization', target: 'Location' },
      { source: 'Asset', target: 'Location' },
    ],
    weight: 0.5,
  },
  TRAVEL: {
    name: 'TRAVEL',
    category: 'LOCATION',
    description: 'Travel relationship',
    properties: [
      { name: 'departure_date', required: false },
      { name: 'return_date', required: false },
      { name: 'purpose', required: false },
      { name: 'transportation', required: false },
    ],
    constraints: [{ source: 'Person', target: 'Location' }],
    weight: 0.4,
  },
  ORIGIN: {
    name: 'ORIGIN',
    category: 'LOCATION',
    description: 'Place of origin',
    properties: [
      { name: 'birth_date', required: false },
      { name: 'citizenship', required: false },
      { name: 'duration', required: false },
    ],
    constraints: [{ source: 'Person', target: 'Location' }],
    weight: 0.8,
  },

  // Legal relationships
  LEGAL_CASE: {
    name: 'LEGAL_CASE',
    category: 'LEGAL',
    description: 'Legal case involvement',
    properties: [
      { name: 'case_number', required: false },
      { name: 'role', required: false },
      { name: 'status', required: false },
      { name: 'date', required: false },
    ],
    constraints: [
      { source: 'Person', target: 'LegalCase' },
      { source: 'Organization', target: 'LegalCase' },
    ],
    weight: 0.7,
  },
  CONTRACT: {
    name: 'CONTRACT',
    category: 'LEGAL',
    description: 'Contractual relationship',
    properties: [
      { name: 'contract_type', required: false },
      { name: 'date', required: false },
      { name: 'value', required: false },
      { name: 'status', required: false },
    ],
    constraints: [
      { source: 'Person', target: 'Person' },
      { source: 'Person', target: 'Organization' },
      { source: 'Organization', target: 'Organization' },
    ],
    weight: 0.8,
  },
  LICENSE: {
    name: 'LICENSE',
    category: 'LEGAL',
    description: 'License or permit relationship',
    properties: [
      { name: 'license_type', required: false },
      { name: 'issue_date', required: false },
      { name: 'expiry_date', required: false },
      { name: 'status', required: false },
    ],
    constraints: [
      { source: 'Person', target: 'Organization' },
      { source: 'Organization', target: 'Organization' },
    ],
    weight: 0.6,
  },

  // Digital relationships
  ACCOUNT: {
    name: 'ACCOUNT',
    category: 'DIGITAL',
    description: 'Digital account relationship',
    properties: [
      { name: 'platform', required: false },
      { name: 'username', required: false },
      { name: 'created_date', required: false },
      { name: 'status', required: false },
    ],
    constraints: [{ source: 'Person', target: 'Organization' }],
    weight: 0.3,
  },
  DIGITAL_TRACE: {
    name: 'DIGITAL_TRACE',
    category: 'DIGITAL',
    description: 'Digital footprint or trace',
    properties: [
      { name: 'ip_address', required: false },
      { name: 'timestamp', required: false },
      { name: 'device', required: false },
      { name: 'action', required: false },
    ],
    constraints: [
      { source: 'Person', target: 'DigitalAsset' },
      { source: 'Person', target: 'Location' },
    ],
    weight: 0.4,
  },

  // Intelligence specific
  SURVEILLANCE: {
    name: 'SURVEILLANCE',
    category: 'INTELLIGENCE',
    description: 'Surveillance relationship',
    properties: [
      { name: 'method', required: false },
      { name: 'since', required: false },
      { name: 'until', required: false },
      { name: 'frequency', required: false },
      { name: 'classification', required: false },
    ],
    constraints: [
      { source: 'Person', target: 'Person' },
      { source: 'Person', target: 'Location' },
      { source: 'Person', target: 'Organization' },
    ],
    weight: 0.8,
  },
  SUSPECT: {
    name: 'SUSPECT',
    category: 'INTELLIGENCE',
    description: 'Suspicion relationship',
    properties: [
      { name: 'suspicion_level', required: false },
      { name: 'since', required: false },
      { name: 'reason', required: false },
      { name: 'status', required: false },
    ],
    constraints: [
      { source: 'Person', target: 'Event' },
      { source: 'Person', target: 'Organization' },
    ],
    weight: 0.9,
  },
  THREAT: {
    name: 'THREAT',
    category: 'INTELLIGENCE',
    description: 'Threat relationship',
    properties: [
      { name: 'threat_level', required: false },
      { name: 'type', required: false },
      { name: 'since', required: false },
      { name: 'credibility', required: false },
    ],
    constraints: [
      { source: 'Person', target: 'Person' },
      { source: 'Person', target: 'Organization' },
      { source: 'Organization', target: 'Organization' },
    ],
    weight: 1.0,
  },
};

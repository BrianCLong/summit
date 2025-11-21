import { v4 as uuid } from 'uuid';
import type { DigitalService, ServiceCategory } from '../models/types.js';

/**
 * Estonia's Digital Services Catalog
 * Reference implementation of world-leading e-government services
 */
export const EstoniaDigitalCatalog: DigitalService[] = [
  {
    id: uuid(),
    name: 'X-Road',
    category: 'governance',
    description: 'Secure data exchange layer connecting all government databases',
    sourceCountry: 'EE',
    version: '7.0',
    maturityLevel: 'production',
    techStack: {
      backend: ['Java', 'Spring Boot', 'REST API'],
      frontend: ['React', 'TypeScript'],
      databases: ['PostgreSQL'],
      infrastructure: ['Kubernetes', 'Docker'],
      security: ['PKI', 'mTLS', 'HSM'],
    },
    integrations: [
      { name: 'National ID', type: 'required', protocol: 'SOAP/REST' },
      { name: 'Time-stamping', type: 'required', protocol: 'RFC 3161' },
    ],
    compliance: ['eIDAS', 'GDPR', 'ISO 27001'],
    dependencies: [],
    metrics: {
      activeUsers: 99,
      transactionsPerYear: 1_500_000_000,
      costSavingsEur: 400_000_000,
      timeSavedHours: 1400,
    },
  },
  {
    id: uuid(),
    name: 'e-ID / Mobile-ID / Smart-ID',
    category: 'identity',
    description: 'National digital identity infrastructure with multiple authentication methods',
    sourceCountry: 'EE',
    version: '3.0',
    maturityLevel: 'production',
    techStack: {
      backend: ['Java', 'C++', 'Go'],
      frontend: ['Native iOS/Android', 'React'],
      databases: ['PostgreSQL', 'LDAP'],
      infrastructure: ['On-premise HSM', 'Cloud hybrid'],
      security: ['PKI', 'Elliptic Curve Crypto', 'FIDO2'],
    },
    integrations: [
      { name: 'X-Road', type: 'required', protocol: 'REST' },
      { name: 'Population Registry', type: 'required', protocol: 'SOAP' },
    ],
    compliance: ['eIDAS LOA High', 'GDPR', 'ISO 27001', 'CC EAL4+'],
    dependencies: ['X-Road'],
    metrics: {
      activeUsers: 1_500_000,
      transactionsPerYear: 500_000_000,
    },
  },
  {
    id: uuid(),
    name: 'i-Voting',
    category: 'voting',
    description: 'Internet voting system for national and local elections',
    sourceCountry: 'EE',
    version: '2.0',
    maturityLevel: 'production',
    techStack: {
      backend: ['Java', 'Go'],
      frontend: ['Qt', 'TypeScript'],
      databases: ['PostgreSQL'],
      infrastructure: ['Air-gapped servers', 'HSM'],
      security: ['End-to-end encryption', 'Homomorphic tallying', 'Zero-knowledge proofs'],
    },
    integrations: [
      { name: 'e-ID', type: 'required', protocol: 'PKCS#11' },
      { name: 'Voter Registry', type: 'required', protocol: 'REST' },
    ],
    compliance: ['CoE e-voting standards', 'OSCE guidelines'],
    dependencies: ['e-ID / Mobile-ID / Smart-ID'],
    metrics: {
      activeUsers: 600_000,
      transactionsPerYear: 1,
    },
  },
  {
    id: uuid(),
    name: 'e-Tax',
    category: 'taxation',
    description: 'Pre-filled tax declarations with 95% auto-completion',
    sourceCountry: 'EE',
    version: '4.0',
    maturityLevel: 'production',
    techStack: {
      backend: ['Java', 'Python'],
      frontend: ['React', 'TypeScript'],
      databases: ['PostgreSQL', 'Elasticsearch'],
      infrastructure: ['Kubernetes', 'AWS'],
      security: ['TLS 1.3', 'Data encryption at rest'],
    },
    integrations: [
      { name: 'X-Road', type: 'required', protocol: 'REST' },
      { name: 'Banking APIs', type: 'required', protocol: 'Open Banking' },
      { name: 'Employer registries', type: 'required', protocol: 'REST' },
    ],
    compliance: ['GDPR', 'Tax directives'],
    dependencies: ['X-Road', 'e-ID / Mobile-ID / Smart-ID'],
    metrics: {
      activeUsers: 800_000,
      timeSavedHours: 5,
      costSavingsEur: 50_000_000,
    },
  },
  {
    id: uuid(),
    name: 'e-Health',
    category: 'healthcare',
    description: 'Nationwide electronic health records and e-prescription system',
    sourceCountry: 'EE',
    version: '3.0',
    maturityLevel: 'production',
    techStack: {
      backend: ['Java', 'HL7 FHIR'],
      frontend: ['React', 'Angular'],
      databases: ['PostgreSQL', 'TimescaleDB'],
      infrastructure: ['Private cloud', 'Kubernetes'],
      security: ['End-to-end encryption', 'Audit logging', 'Consent management'],
    },
    integrations: [
      { name: 'X-Road', type: 'required', protocol: 'REST' },
      { name: 'Pharmacies', type: 'required', protocol: 'HL7 FHIR' },
      { name: 'Hospitals', type: 'required', protocol: 'HL7 FHIR' },
    ],
    compliance: ['GDPR', 'HIPAA-equivalent', 'HL7 standards'],
    dependencies: ['X-Road', 'e-ID / Mobile-ID / Smart-ID'],
    metrics: {
      activeUsers: 1_300_000,
      transactionsPerYear: 100_000_000,
    },
  },
  {
    id: uuid(),
    name: 'e-Business Registry',
    category: 'business',
    description: 'Company registration in 18 minutes, fully online',
    sourceCountry: 'EE',
    version: '2.5',
    maturityLevel: 'production',
    techStack: {
      backend: ['Java', 'Spring'],
      frontend: ['React'],
      databases: ['PostgreSQL'],
      infrastructure: ['Kubernetes'],
      security: ['Digital signatures', 'Audit trail'],
    },
    integrations: [
      { name: 'X-Road', type: 'required', protocol: 'REST' },
      { name: 'Tax Authority', type: 'required', protocol: 'REST' },
      { name: 'Banking', type: 'optional', protocol: 'Open Banking' },
    ],
    compliance: ['EU Company Law Directive', 'GDPR'],
    dependencies: ['X-Road', 'e-ID / Mobile-ID / Smart-ID'],
    metrics: {
      activeUsers: 200_000,
      transactionsPerYear: 50_000,
      timeSavedHours: 8,
    },
  },
  {
    id: uuid(),
    name: 'e-Residency',
    category: 'residency',
    description: 'Digital residency program for global entrepreneurs',
    sourceCountry: 'EE',
    version: '2.0',
    maturityLevel: 'production',
    techStack: {
      backend: ['Node.js', 'Python'],
      frontend: ['React', 'Next.js'],
      databases: ['PostgreSQL', 'MongoDB'],
      infrastructure: ['AWS', 'Kubernetes'],
      security: ['KYC/AML integration', 'Biometric verification'],
    },
    integrations: [
      { name: 'X-Road', type: 'required', protocol: 'REST' },
      { name: 'Police/Border', type: 'required', protocol: 'REST' },
      { name: 'e-Business Registry', type: 'required', protocol: 'REST' },
    ],
    compliance: ['AML5', 'KYC', 'GDPR'],
    dependencies: ['X-Road', 'e-ID / Mobile-ID / Smart-ID', 'e-Business Registry'],
    metrics: {
      activeUsers: 100_000,
      transactionsPerYear: 30_000,
    },
  },
  {
    id: uuid(),
    name: 'e-Land Registry',
    category: 'land_registry',
    description: 'Digital property registration and transactions',
    sourceCountry: 'EE',
    version: '3.0',
    maturityLevel: 'production',
    techStack: {
      backend: ['Java'],
      frontend: ['React'],
      databases: ['PostgreSQL', 'PostGIS'],
      infrastructure: ['On-premise', 'Hybrid cloud'],
      security: ['Blockchain anchoring', 'Digital signatures'],
    },
    integrations: [
      { name: 'X-Road', type: 'required', protocol: 'REST' },
      { name: 'Notary System', type: 'required', protocol: 'REST' },
      { name: 'Tax Authority', type: 'required', protocol: 'REST' },
    ],
    compliance: ['INSPIRE Directive', 'GDPR'],
    dependencies: ['X-Road', 'e-ID / Mobile-ID / Smart-ID'],
    metrics: {
      transactionsPerYear: 150_000,
      timeSavedHours: 24,
    },
  },
  {
    id: uuid(),
    name: 'KSI Blockchain',
    category: 'cybersecurity',
    description: 'Keyless Signature Infrastructure for data integrity',
    sourceCountry: 'EE',
    version: '2.0',
    maturityLevel: 'production',
    techStack: {
      backend: ['C', 'Java'],
      frontend: ['REST APIs'],
      databases: ['Custom hash tree'],
      infrastructure: ['Distributed nodes'],
      security: ['Hash-based signatures', 'Quantum-resistant'],
    },
    integrations: [
      { name: 'Any system', type: 'optional', protocol: 'REST/SDK' },
    ],
    compliance: ['ISO 27001', 'FIPS 140-2'],
    dependencies: [],
    metrics: {
      transactionsPerYear: 1_000_000_000,
    },
  },
  {
    id: uuid(),
    name: 'e-School (eKool)',
    category: 'education',
    description: 'Digital school management and learning platform',
    sourceCountry: 'EE',
    version: '4.0',
    maturityLevel: 'production',
    techStack: {
      backend: ['Ruby on Rails', 'Node.js'],
      frontend: ['React', 'React Native'],
      databases: ['PostgreSQL'],
      infrastructure: ['AWS'],
      security: ['OAuth 2.0', 'GDPR compliance'],
    },
    integrations: [
      { name: 'X-Road', type: 'required', protocol: 'REST' },
      { name: 'Population Registry', type: 'required', protocol: 'REST' },
    ],
    compliance: ['GDPR', 'Accessibility standards'],
    dependencies: ['X-Road'],
    metrics: {
      activeUsers: 500_000,
      transactionsPerYear: 50_000_000,
    },
  },
];

/**
 * Get services by category
 */
export function getServicesByCategory(category: ServiceCategory): DigitalService[] {
  return EstoniaDigitalCatalog.filter(s => s.category === category);
}

/**
 * Get service dependencies graph
 */
export function getServiceDependencyGraph(): Map<string, string[]> {
  const graph = new Map<string, string[]>();
  for (const service of EstoniaDigitalCatalog) {
    graph.set(service.name, service.dependencies);
  }
  return graph;
}

/**
 * Calculate implementation order based on dependencies
 */
export function calculateImplementationOrder(serviceNames: string[]): string[] {
  const graph = getServiceDependencyGraph();
  const visited = new Set<string>();
  const order: string[] = [];

  function visit(name: string) {
    if (visited.has(name)) return;
    visited.add(name);
    const deps = graph.get(name) || [];
    for (const dep of deps) {
      if (serviceNames.includes(dep)) {
        visit(dep);
      }
    }
    order.push(name);
  }

  for (const name of serviceNames) {
    visit(name);
  }

  return order;
}

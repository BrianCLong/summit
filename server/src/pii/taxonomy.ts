import {
  PIIType,
  SeverityLevel,
  TaxonomyDefinition,
  TaxonomyNode,
} from './types.js';

const DEFAULT_TAXONOMY_NAME = 'global-default';

const buildNode = (
  id: string,
  label: string,
  piiTypes: PIIType[],
  severity: SeverityLevel,
  categories: string[],
  description?: string,
  policyTags: string[] = [],
): TaxonomyNode => ({
  id,
  label,
  piiTypes,
  severity,
  categories,
  description,
  policyTags,
});

export const defaultTaxonomyDefinition: TaxonomyDefinition = {
  name: DEFAULT_TAXONOMY_NAME,
  version: '1.0.0',
  nodes: [
    buildNode(
      'identity.core',
      'Identity Core',
      [
        'fullName',
        'firstName',
        'lastName',
        'middleName',
        'maidenName',
        'alias',
        'preferredName',
      ],
      'medium',
      ['identity'],
      'Personally identifying names',
    ),
    buildNode(
      'identity.credentials',
      'Identity Credentials',
      [
        'username',
        'password',
        'passwordHint',
        'accountToken',
        'accountPin',
        'sessionId',
        'cookieId',
      ],
      'high',
      ['identity', 'credentials'],
      'Account credentials require high protection',
      ['restricted'],
    ),
    buildNode(
      'contact.direct',
      'Direct Contact',
      ['email', 'phoneNumber', 'mobileNumber', 'faxNumber'],
      'high',
      ['contact'],
      'Direct communications channels',
      ['confidential'],
    ),
    buildNode(
      'location.address',
      'Physical Address',
      [
        'homeAddress',
        'mailingAddress',
        'shippingAddress',
        'billingAddress',
        'postalCode',
        'city',
        'state',
        'country',
      ],
      'high',
      ['location'],
      'Address and locality data',
      ['restricted'],
    ),
    buildNode(
      'location.geo',
      'Geolocation',
      ['latitude', 'longitude', 'geoCoordinate'],
      'medium',
      ['location', 'geospatial'],
      'Precise geolocation coordinates',
    ),
    buildNode(
      'government.identity',
      'Government Identifiers',
      [
        'nationalId',
        'socialSecurityNumber',
        'itin',
        'taxId',
        'passportNumber',
        'driverLicenseNumber',
        'vehicleIdentificationNumber',
        'licensePlate',
      ],
      'critical',
      ['identity', 'regulatory'],
      'Government issued identifiers',
      ['restricted', 'audit'],
    ),
    buildNode(
      'financial.accounts',
      'Financial Accounts',
      [
        'creditCardNumber',
        'debitCardNumber',
        'cardExpiration',
        'cardSecurityCode',
        'bankAccountNumber',
        'routingNumber',
        'iban',
        'swiftCode',
        'accountNumber',
        'financialTransactionId',
      ],
      'critical',
      ['financial'],
      'Financial account and transaction data',
      ['pci'],
    ),
    buildNode(
      'financial.auth',
      'Financial Authentication',
      ['accountPin'],
      'critical',
      ['financial', 'credentials'],
      'PIN and verification codes',
      ['pci'],
    ),
    buildNode(
      'demographic',
      'Demographic Attributes',
      ['dateOfBirth', 'age', 'gender', 'maritalStatus'],
      'medium',
      ['demographic'],
      'Demographic and profile fields',
    ),
    buildNode(
      'employment',
      'Employment & Education IDs',
      ['employeeId', 'studentId'],
      'high',
      ['identity', 'employment'],
      'Workplace and education identifiers',
    ),
    buildNode(
      'health.identity',
      'Health Identifiers',
      ['patientId', 'healthRecordNumber', 'insurancePolicyNumber'],
      'critical',
      ['health'],
      'Healthcare specific identifiers',
      ['phi'],
    ),
    buildNode(
      'health.records',
      'Health Records',
      ['medicalDiagnosis', 'prescription', 'allergy', 'geneticMarker'],
      'critical',
      ['health'],
      'Sensitive health attributes',
      ['phi'],
    ),
    buildNode(
      'biometric',
      'Biometric Identifiers',
      [
        'biometricFingerprint',
        'biometricFace',
        'biometricVoice',
        'biometricRetina',
        'biometricDNA',
      ],
      'critical',
      ['biometric'],
      'Biometric measurements',
      ['phi', 'restricted'],
    ),
    buildNode(
      'network',
      'Network Identifiers',
      ['ipAddress', 'macAddress', 'deviceId', 'imei', 'imsi'],
      'high',
      ['network'],
      'Device and network identifiers',
    ),
    buildNode(
      'digital',
      'Digital Artifacts',
      ['url', 'sslcertificate'],
      'medium',
      ['digital'],
      'URLs, certificates and digital traces',
    ),
  ],
};

const flattenNodes = (
  nodes: TaxonomyNode[],
  prefix: string[] = [],
): TaxonomyNode[] => {
  const results: TaxonomyNode[] = [];
  for (const node of nodes) {
    results.push({ ...node, id: [...prefix, node.id].join('.') });
    if (node.children) {
      results.push(...flattenNodes(node.children, [...prefix, node.id]));
    }
  }
  return results;
};

export class TaxonomyManager {
  private readonly taxonomies = new Map<string, TaxonomyDefinition>();
  private readonly cache = new Map<string, Map<PIIType, TaxonomyNode>>();

  constructor(baseDefinition: TaxonomyDefinition = defaultTaxonomyDefinition) {
    this.registerTaxonomy(baseDefinition, { overwrite: true });
  }

  registerTaxonomy(
    definition: TaxonomyDefinition,
    options: { overwrite?: boolean } = {},
  ): void {
    const name = definition.name;
    if (!options.overwrite && this.taxonomies.has(name)) {
      throw new Error(
        `Taxonomy ${name} already exists. Use overwrite option to replace.`,
      );
    }
    this.taxonomies.set(name, {
      ...definition,
      nodes: definition.nodes.map((node) => ({ ...node })),
    });
    this.cache.delete(name);
  }

  extendTaxonomy(name: string, nodes: TaxonomyNode[]): void {
    const taxonomy = this.taxonomies.get(name);
    if (!taxonomy) {
      throw new Error(`Unknown taxonomy ${name}`);
    }
    taxonomy.nodes.push(...nodes.map((node) => ({ ...node })));
    this.cache.delete(name);
  }

  getNodeForType(
    type: PIIType,
    taxonomyName: string = DEFAULT_TAXONOMY_NAME,
  ): TaxonomyNode | undefined {
    const taxonomyCache = this.ensureCache(taxonomyName);
    return taxonomyCache.get(type);
  }

  classify(
    type: PIIType,
    taxonomyName: string = DEFAULT_TAXONOMY_NAME,
  ): { node: TaxonomyNode; taxonomy: string } | undefined {
    const node = this.getNodeForType(type, taxonomyName);
    if (!node) {
      return undefined;
    }
    return { node, taxonomy: taxonomyName };
  }

  listTaxonomies(): string[] {
    return [...this.taxonomies.keys()];
  }

  getDefinition(
    name: string = DEFAULT_TAXONOMY_NAME,
  ): TaxonomyDefinition | undefined {
    const definition = this.taxonomies.get(name);
    if (!definition) {
      return undefined;
    }
    return {
      ...definition,
      nodes: definition.nodes.map((node) => ({
        ...node,
        children: node.children ? [...node.children] : undefined,
      })),
    };
  }

  private ensureCache(name: string): Map<PIIType, TaxonomyNode> {
    if (!this.cache.has(name)) {
      const definition = this.taxonomies.get(name);
      if (!definition) {
        throw new Error(`Unknown taxonomy ${name}`);
      }
      const flattened = flattenNodes(definition.nodes);
      const map = new Map<PIIType, TaxonomyNode>();
      for (const node of flattened) {
        for (const type of node.piiTypes) {
          map.set(type, node);
        }
      }
      this.cache.set(name, map);
    }
    return this.cache.get(name)!;
  }
}

export { DEFAULT_TAXONOMY_NAME };

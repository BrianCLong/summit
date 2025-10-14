export type PIIType =
  | 'fullName'
  | 'firstName'
  | 'lastName'
  | 'middleName'
  | 'maidenName'
  | 'alias'
  | 'preferredName'
  | 'username'
  | 'email'
  | 'phoneNumber'
  | 'mobileNumber'
  | 'faxNumber'
  | 'homeAddress'
  | 'mailingAddress'
  | 'shippingAddress'
  | 'billingAddress'
  | 'latitude'
  | 'longitude'
  | 'geoCoordinate'
  | 'postalCode'
  | 'city'
  | 'state'
  | 'country'
  | 'nationalId'
  | 'socialSecurityNumber'
  | 'itin'
  | 'taxId'
  | 'passportNumber'
  | 'driverLicenseNumber'
  | 'vehicleIdentificationNumber'
  | 'licensePlate'
  | 'creditCardNumber'
  | 'debitCardNumber'
  | 'cardExpiration'
  | 'cardSecurityCode'
  | 'bankAccountNumber'
  | 'routingNumber'
  | 'iban'
  | 'swiftCode'
  | 'accountPin'
  | 'password'
  | 'passwordHint'
  | 'accountToken'
  | 'dateOfBirth'
  | 'age'
  | 'gender'
  | 'maritalStatus'
  | 'employeeId'
  | 'studentId'
  | 'patientId'
  | 'healthRecordNumber'
  | 'insurancePolicyNumber'
  | 'medicalDiagnosis'
  | 'prescription'
  | 'allergy'
  | 'geneticMarker'
  | 'biometricFingerprint'
  | 'biometricFace'
  | 'biometricVoice'
  | 'biometricRetina'
  | 'biometricDNA'
  | 'ipAddress'
  | 'macAddress'
  | 'deviceId'
  | 'imei'
  | 'imsi'
  | 'cookieId'
  | 'sessionId'
  | 'accountNumber'
  | 'url'
  | 'sslcertificate'
  | 'financialTransactionId';

export interface ClassificationContext {
  text: string;
  before: string;
  after: string;
  schemaField?: string;
  schemaDescription?: string;
  schemaPath?: string[];
  recordId?: string;
  tableName?: string;
  additionalMetadata?: Record<string, unknown>;
}

export interface EntityMatch {
  id: string;
  type: PIIType;
  value: string;
  start: number;
  end: number;
  detectors: string[];
  confidence: number;
  context: ClassificationContext;
  rawScore: number;
  metadata?: Record<string, unknown>;
}

export type SeverityLevel = 'low' | 'medium' | 'high' | 'critical';

export interface ClassifiedEntity extends EntityMatch {
  severity: SeverityLevel;
  taxonomy: string;
  categories: string[];
  policyTags: string[];
}

export interface SchemaFieldMetadata {
  fieldName: string;
  label?: string;
  description?: string;
  piiHints?: PIIType[];
  tags?: string[];
  riskLevel?: SeverityLevel;
}

export interface SchemaMetadata {
  name: string;
  version?: string;
  fields: SchemaFieldMetadata[];
  tags?: string[];
  sourceType?: string;
}

export interface TaxonomyNode {
  id: string;
  label: string;
  piiTypes: PIIType[];
  severity: SeverityLevel;
  description?: string;
  categories?: string[];
  policyTags?: string[];
  children?: TaxonomyNode[];
}

export interface TaxonomyDefinition {
  name: string;
  version: string;
  nodes: TaxonomyNode[];
}

export interface RecognitionRequest {
  value: string;
  schemaField?: SchemaFieldMetadata;
  schema?: SchemaMetadata;
  recordId?: string;
  tableName?: string;
  additionalContext?: Record<string, unknown>;
}

export interface RecognitionOptions {
  includeSurroundingTokens?: boolean;
  schema?: SchemaMetadata;
  schemaField?: SchemaFieldMetadata;
  taxonomyName?: string;
  customPatterns?: PatternDefinition[];
  minimumConfidence?: number;
  signalBoost?: Partial<Record<PIIType, number>>;
}

export interface PatternDefinition {
  id: string;
  type: PIIType;
  description: string;
  regex: RegExp;
  confidence: number;
  examples?: string[];
  contextHints?: string[];
}

export interface RecognitionStats {
  evaluatedPatterns: number;
  matchedPatterns: number;
  mlDecisions: number;
  durationMs: number;
}

export interface RecognitionResult {
  entities: EntityMatch[];
  stats: RecognitionStats;
}

export interface ClassificationResult {
  entities: ClassifiedEntity[];
  summary: {
    totalEntities: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
    taxonomyBreakdown: Record<string, number>;
  };
  stats: RecognitionStats;
}

export interface ScanTargetRecord {
  id: string;
  value: unknown;
  schema?: SchemaMetadata;
  tableName?: string;
  updatedAt?: string;
  hash?: string;
}

export interface ScanOptions {
  batchSize?: number;
  incremental?: boolean;
  includeUnchanged?: boolean;
  minimumConfidence?: number;
}

export interface ScanResult {
  recordId: string;
  tableName?: string;
  detected: ClassifiedEntity[];
  changed?: boolean;
  previousHash?: string;
  currentHash?: string;
}

export interface BulkScanReport {
  results: ScanResult[];
  newDetections: number;
  updatedDetections: number;
  unchanged: number;
  durationMs: number;
}

export interface VerificationTask {
  taskId: string;
  entity: ClassifiedEntity;
  createdAt: string;
  status: 'pending' | 'approved' | 'rejected';
  reviewer?: string;
  notes?: string;
}

export interface VerificationWorkflowHooks {
  onTaskCreated?: (task: VerificationTask) => Promise<void> | void;
  onTaskResolved?: (task: VerificationTask) => Promise<void> | void;
}


/**
 * Test Datasets with PII for Validation
 *
 * Contains sample datasets with various PII types and sensitivity levels
 * for testing detection, tagging, and redaction functionality.
 */

/**
 * Low-sensitivity dataset
 */
export const lowSensitivityDataset = [
  {
    id: 'user001',
    username: 'john_doe',
    city: 'San Francisco',
    state: 'CA',
    country: 'USA',
    age: 32,
    preferences: {
      theme: 'dark',
      language: 'en-US',
    },
  },
  {
    id: 'user002',
    username: 'jane_smith',
    city: 'New York',
    state: 'NY',
    country: 'USA',
    age: 28,
    preferences: {
      theme: 'light',
      language: 'en-US',
    },
  },
];

/**
 * Medium-sensitivity dataset with names and locations
 */
export const mediumSensitivityDataset = [
  {
    id: 'customer001',
    fullName: 'John Michael Doe',
    firstName: 'John',
    lastName: 'Doe',
    dateOfBirth: '1991-05-15',
    address: {
      street: '123 Main St',
      city: 'San Francisco',
      state: 'CA',
      postalCode: '94102',
    },
    geoCoordinate: {
      latitude: 37.7749,
      longitude: -122.4194,
    },
  },
  {
    id: 'customer002',
    fullName: 'Jane Elizabeth Smith',
    firstName: 'Jane',
    lastName: 'Smith',
    dateOfBirth: '1995-08-22',
    address: {
      street: '456 Broadway Ave',
      city: 'New York',
      state: 'NY',
      postalCode: '10001',
    },
    geoCoordinate: {
      latitude: 40.7128,
      longitude: -74.0060,
    },
  },
];

/**
 * High-sensitivity dataset with contact information
 */
export const highSensitivityDataset = [
  {
    id: 'contact001',
    fullName: 'Robert James Wilson',
    email: 'robert.wilson@example.com',
    phoneNumber: '+1-415-555-1234',
    mobileNumber: '+1-415-555-5678',
    homeAddress: '789 Oak Street, Apt 4B, San Francisco, CA 94103',
    employeeId: 'EMP-2023-001',
    driverLicenseNumber: 'D1234567',
    ipAddress: '192.168.1.100',
  },
  {
    id: 'contact002',
    fullName: 'Sarah Michelle Johnson',
    email: 'sarah.johnson@example.com',
    phoneNumber: '+1-212-555-9876',
    mobileNumber: '+1-212-555-4321',
    homeAddress: '321 Park Avenue, Suite 12, New York, NY 10022',
    employeeId: 'EMP-2023-002',
    driverLicenseNumber: 'NY987654321',
    ipAddress: '10.0.2.15',
  },
];

/**
 * Critical-sensitivity dataset with financial and government IDs
 */
export const criticalSensitivityDataset = [
  {
    id: 'secure001',
    fullName: 'Michael Thomas Anderson',
    socialSecurityNumber: '123-45-6789',
    passportNumber: 'US1234567',
    taxId: '98-7654321',
    creditCardNumber: '4532-1234-5678-9010',
    cardExpiration: '12/2025',
    cardSecurityCode: '123',
    bankAccountNumber: '1234567890',
    routingNumber: '021000021',
    iban: 'GB82WEST12345698765432',
    accountPin: '5678',
    password: 'MySecureP@ssw0rd!',
  },
  {
    id: 'secure002',
    fullName: 'Emily Catherine Martinez',
    socialSecurityNumber: '987-65-4321',
    passportNumber: 'US9876543',
    taxId: '12-3456789',
    creditCardNumber: '5425-2334-3010-9876',
    cardExpiration: '06/2026',
    cardSecurityCode: '456',
    bankAccountNumber: '9876543210',
    routingNumber: '011000015',
    iban: 'FR1420041010050500013M02606',
    accountPin: '1234',
    password: 'AnotherS3cure!Pass',
  },
];

/**
 * Healthcare dataset with PHI
 */
export const healthcareDataset = [
  {
    id: 'patient001',
    fullName: 'David Christopher Lee',
    dateOfBirth: '1980-03-10',
    patientId: 'PAT-2023-001',
    healthRecordNumber: 'HRN-123456',
    insurancePolicyNumber: 'INS-987654321',
    medicalDiagnosis: 'Type 2 Diabetes Mellitus',
    prescription: 'Metformin 500mg twice daily',
    allergy: 'Penicillin',
    geneticMarker: 'BRCA1 mutation',
    biometricData: {
      type: 'fingerprint',
      hash: 'a1b2c3d4e5f6',
    },
  },
  {
    id: 'patient002',
    fullName: 'Lisa Anne Thompson',
    dateOfBirth: '1975-11-20',
    patientId: 'PAT-2023-002',
    healthRecordNumber: 'HRN-789012',
    insurancePolicyNumber: 'INS-123456789',
    medicalDiagnosis: 'Hypertension',
    prescription: 'Lisinopril 10mg daily',
    allergy: 'None',
    geneticMarker: 'None',
    biometricData: {
      type: 'retina',
      hash: 'f6e5d4c3b2a1',
    },
  },
];

/**
 * Mixed-sensitivity dataset with various PII types
 */
export const mixedSensitivityDataset = [
  {
    id: 'mixed001',
    type: 'employee',
    publicInfo: {
      username: 'alex_developer',
      department: 'Engineering',
      jobTitle: 'Senior Software Engineer',
    },
    personalInfo: {
      fullName: 'Alex Jordan Taylor',
      email: 'alex.taylor@company.com',
      phoneNumber: '+1-650-555-7890',
    },
    sensitiveInfo: {
      employeeId: 'EMP-2023-100',
      socialSecurityNumber: '555-12-3456',
      salary: 150000,
      bankAccount: {
        accountNumber: '5555666677778888',
        routingNumber: '123456789',
      },
    },
    metadata: {
      createdAt: '2023-01-15T10:30:00Z',
      lastModified: '2024-03-20T14:45:00Z',
    },
  },
];

/**
 * Nested structure dataset for testing recursive detection
 */
export const nestedStructureDataset = {
  id: 'nested001',
  organization: {
    name: 'Acme Corporation',
    employees: [
      {
        id: 'emp001',
        name: 'James Michael Brown',
        contact: {
          email: 'james.brown@acme.com',
          phone: '+1-555-0001',
          address: {
            street: '100 Technology Drive',
            city: 'Palo Alto',
            state: 'CA',
            zip: '94301',
          },
        },
        credentials: {
          username: 'jbrown',
          passwordHash: '$2b$10$AbCdEfGhIjKlMnOpQrStUv',
          apiToken: 'tok_1234567890abcdef',
        },
        personal: {
          ssn: '111-22-3333',
          dob: '1985-07-04',
          passport: 'US111222333',
        },
      },
      {
        id: 'emp002',
        name: 'Patricia Anne Davis',
        contact: {
          email: 'patricia.davis@acme.com',
          phone: '+1-555-0002',
          address: {
            street: '200 Innovation Way',
            city: 'Mountain View',
            state: 'CA',
            zip: '94043',
          },
        },
        credentials: {
          username: 'pdavis',
          passwordHash: '$2b$10$XyZwVuTsRqPoNmLkJiHgFe',
          apiToken: 'tok_abcdef1234567890',
        },
        personal: {
          ssn: '444-55-6666',
          dob: '1990-12-25',
          passport: 'US444555666',
        },
      },
    ],
  },
};

/**
 * Expected PII detection results for each dataset
 */
export const expectedDetections = {
  lowSensitivity: {
    totalRecords: 2,
    piiTypesDetected: ['city', 'state', 'country'],
    maxSeverity: 'low',
    sensitivityClass: 'INTERNAL',
  },
  mediumSensitivity: {
    totalRecords: 2,
    piiTypesDetected: [
      'fullName',
      'firstName',
      'lastName',
      'dateOfBirth',
      'homeAddress',
      'postalCode',
      'latitude',
      'longitude',
    ],
    maxSeverity: 'medium',
    sensitivityClass: 'CONFIDENTIAL',
  },
  highSensitivity: {
    totalRecords: 2,
    piiTypesDetected: [
      'fullName',
      'email',
      'phoneNumber',
      'mobileNumber',
      'homeAddress',
      'employeeId',
      'driverLicenseNumber',
      'ipAddress',
    ],
    maxSeverity: 'high',
    sensitivityClass: 'HIGHLY_SENSITIVE',
  },
  criticalSensitivity: {
    totalRecords: 2,
    piiTypesDetected: [
      'fullName',
      'socialSecurityNumber',
      'passportNumber',
      'taxId',
      'creditCardNumber',
      'cardExpiration',
      'cardSecurityCode',
      'bankAccountNumber',
      'routingNumber',
      'iban',
      'accountPin',
      'password',
    ],
    maxSeverity: 'critical',
    sensitivityClass: 'TOP_SECRET',
  },
  healthcare: {
    totalRecords: 2,
    piiTypesDetected: [
      'fullName',
      'dateOfBirth',
      'patientId',
      'healthRecordNumber',
      'insurancePolicyNumber',
      'medicalDiagnosis',
      'prescription',
      'allergy',
      'geneticMarker',
      'biometricFingerprint',
    ],
    maxSeverity: 'critical',
    sensitivityClass: 'TOP_SECRET',
    regulatoryTags: ['HIPAA', 'GDPR'],
  },
};

/**
 * Test user contexts with different clearance levels
 */
export const testUsers = {
  admin: {
    userId: 'admin001',
    role: 'ADMIN' as const,
    clearance: 10,
    purpose: 'investigation' as const,
  },
  analyst: {
    userId: 'analyst001',
    role: 'ANALYST' as const,
    clearance: 3,
    purpose: 'analysis' as const,
  },
  viewer: {
    userId: 'viewer001',
    role: 'VIEWER' as const,
    clearance: 1,
    purpose: undefined,
  },
  unauthorized: {
    userId: 'unauth001',
    role: 'VIEWER' as const,
    clearance: 0,
    purpose: undefined,
  },
};

/**
 * Expected redaction results by user role
 */
export const expectedRedactions = {
  admin: {
    criticalDataset: {
      redactedFields: [],
      accessDenied: false,
    },
  },
  analyst: {
    criticalDataset: {
      redactedFields: [
        'socialSecurityNumber',
        'passportNumber',
        'creditCardNumber',
        'cardSecurityCode',
        'password',
      ],
      accessDenied: false,
      partiallyMasked: [
        'bankAccountNumber',
        'email',
      ],
    },
  },
  viewer: {
    criticalDataset: {
      redactedFields: [
        'socialSecurityNumber',
        'passportNumber',
        'creditCardNumber',
        'cardSecurityCode',
        'password',
        'bankAccountNumber',
        'email',
        'phoneNumber',
      ],
      accessDenied: true,
    },
  },
};

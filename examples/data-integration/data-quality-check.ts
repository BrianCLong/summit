/**
 * Example: Data quality validation and profiling
 */

import { createLogger, transports, format } from 'winston';
import { DataProfiler } from '../../packages/data-quality/src/DataProfiler';
import { DataValidator } from '../../packages/etl-framework/src/validation/DataValidator';
import { TransformationConfig } from '../../packages/data-integration/src/types';

const logger = createLogger({
  level: 'info',
  format: format.combine(format.timestamp(), format.json()),
  transports: [new transports.Console()]
});

// Sample customer data
const customerData = [
  {
    customer_id: '001',
    first_name: 'John',
    last_name: 'Doe',
    email: 'john.doe@example.com',
    phone: '+1-555-0100',
    age: 35,
    signup_date: '2024-01-15',
    country: 'USA',
    revenue: 15000
  },
  {
    customer_id: '002',
    first_name: 'Jane',
    last_name: 'Smith',
    email: 'jane.smith@example.com',
    phone: '+1-555-0101',
    age: 28,
    signup_date: '2024-02-20',
    country: 'USA',
    revenue: 22000
  },
  {
    customer_id: '003',
    first_name: 'Bob',
    last_name: 'Johnson',
    email: 'invalid-email',  // Invalid email
    phone: '+1-555-0102',
    age: 150,  // Invalid age
    signup_date: '2024-03-10',
    country: 'Canada',
    revenue: 8000
  },
  {
    customer_id: '004',
    first_name: 'Alice',
    last_name: 'Williams',
    email: null,  // Missing email
    phone: '+1-555-0103',
    age: 42,
    signup_date: '2024-04-05',
    country: 'UK',
    revenue: 31000
  }
];

// Define validation rules
const validationConfig: TransformationConfig = {
  type: 'custom',
  transformations: [],
  validations: [
    {
      id: 'email-required',
      name: 'Email is required',
      type: 'null',
      config: {
        field: 'email',
        allowNull: false
      },
      severity: 'error',
      action: 'warn'
    },
    {
      id: 'email-format',
      name: 'Email must be valid',
      type: 'format',
      config: {
        field: 'email',
        format: 'email'
      },
      severity: 'error',
      action: 'warn'
    },
    {
      id: 'age-range',
      name: 'Age must be realistic',
      type: 'range',
      config: {
        field: 'age',
        min: 18,
        max: 120
      },
      severity: 'warning',
      action: 'warn'
    },
    {
      id: 'phone-format',
      name: 'Phone must be valid',
      type: 'format',
      config: {
        field: 'phone',
        format: 'phone'
      },
      severity: 'warning',
      action: 'warn'
    },
    {
      id: 'revenue-positive',
      name: 'Revenue must be positive',
      type: 'range',
      config: {
        field: 'revenue',
        min: 0
      },
      severity: 'error',
      action: 'warn'
    }
  ]
};

async function main() {
  try {
    logger.info('Starting data quality check');

    // 1. Profile the data
    logger.info('=== Data Profiling ===');
    const profiler = new DataProfiler(logger);
    const profile = await profiler.profileDataset(customerData, 'customers');

    logger.info('Dataset Profile:', {
      rowCount: profile.rowCount,
      columnCount: profile.columnCount,
      qualityScore: profile.qualityScore.toFixed(2)
    });

    // Log column profiles
    for (const col of profile.columns) {
      logger.info(`Column: ${col.name}`, {
        dataType: col.dataType,
        nullCount: col.nullCount,
        distinctCount: col.distinctCount,
        completeness: (col.completeness * 100).toFixed(2) + '%',
        examples: col.examples.slice(0, 3)
      });

      if (col.topValues) {
        logger.info(`  Top values:`, col.topValues.slice(0, 3));
      }
    }

    // 2. Validate the data
    logger.info('\n=== Data Validation ===');
    const validator = new DataValidator(validationConfig, logger);
    const validationResult = await validator.validate(customerData);

    logger.info('Validation Result:', {
      isValid: validationResult.isValid,
      totalErrors: validationResult.errors.length,
      totalWarnings: validationResult.warnings.length,
      failedRecords: validationResult.failedRecords.length
    });

    // Log validation errors
    if (validationResult.errors.length > 0) {
      logger.info('Validation Errors:');
      for (const error of validationResult.errors) {
        logger.error(`  Record ${error.recordId}: ${error.message}`);
      }
    }

    // Log validation warnings
    if (validationResult.warnings.length > 0) {
      logger.info('Validation Warnings:');
      for (const warning of validationResult.warnings) {
        logger.warn(`  Record ${warning.recordId}: ${warning.message}`);
      }
    }

    // 3. Generate quality report
    logger.info('\n=== Quality Report ===');
    const qualityReport = {
      dataset: 'customers',
      profiledAt: profile.profiledAt,
      qualityScore: profile.qualityScore,
      completeness: {
        avg: (profile.columns.reduce((sum, c) => sum + c.completeness, 0) / profile.columns.length * 100).toFixed(2) + '%',
        byColumn: profile.columns.map(c => ({
          name: c.name,
          completeness: (c.completeness * 100).toFixed(2) + '%'
        }))
      },
      validation: {
        totalRecords: customerData.length,
        validRecords: customerData.length - validationResult.failedRecords.length,
        invalidRecords: validationResult.failedRecords.length,
        errorRate: (validationResult.failedRecords.length / customerData.length * 100).toFixed(2) + '%'
      },
      recommendations: []
    };

    // Add recommendations based on findings
    if (qualityReport.qualityScore < 80) {
      qualityReport.recommendations.push('Overall data quality is below threshold (80%)');
    }

    for (const col of profile.columns) {
      if (col.completeness < 0.9) {
        qualityReport.recommendations.push(`Column '${col.name}' has low completeness (${(col.completeness * 100).toFixed(0)}%)`);
      }
    }

    if (validationResult.errors.length > 0) {
      qualityReport.recommendations.push(`${validationResult.errors.length} validation errors need to be fixed`);
    }

    logger.info('Quality Report:', JSON.stringify(qualityReport, null, 2));

    process.exit(0);
  } catch (error) {
    logger.error('Data quality check failed', { error });
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

export { main };

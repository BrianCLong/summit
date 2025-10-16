#!/usr/bin/env node
/**
 * Destructive SQL Operation Detector
 *
 * Scans migration files for potentially destructive SQL operations
 * and flags them for manual review and approval.
 *
 * Usage: node scripts/check-destructive-sql.js <migrations-directory>
 */

const fs = require('fs');
const path = require('path');

// Destructive SQL patterns to detect
const DESTRUCTIVE_PATTERNS = [
  // Table/Column operations
  'DROP TABLE',
  'DROP COLUMN',
  'ALTER TABLE.*DROP',
  'TRUNCATE TABLE',
  'TRUNCATE',

  // Data operations
  'DELETE FROM.*WHERE',
  'DELETE FROM',
  'UPDATE.*WHERE.*=.*',

  // Index/Constraint operations
  'DROP INDEX',
  'DROP CONSTRAINT',
  'DROP FOREIGN KEY',

  // Schema operations
  'DROP SCHEMA',
  'DROP DATABASE',
  'DROP SEQUENCE',
  'DROP FUNCTION',
  'DROP PROCEDURE',
  'DROP TRIGGER',
  'DROP VIEW',

  // Dangerous alterations
  'ALTER COLUMN.*DROP',
  'ALTER TABLE.*RENAME TO',
  'RENAME TABLE',
];

// Patterns that are usually safe even if they match destructive patterns
const SAFE_EXCEPTIONS = [
  // Common safe patterns
  'DROP TABLE IF EXISTS.*temp',
  'DROP TABLE IF EXISTS.*staging',
  'CREATE OR REPLACE',
  'DELETE FROM.*WHERE.*created_at < NOW()',
  'DELETE FROM.*WHERE.*id = temp',
];

function analyzeFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const contentUpper = content.toUpperCase();

    const findings = [];

    // Check each destructive pattern
    for (const pattern of DESTRUCTIVE_PATTERNS) {
      const regex = new RegExp(pattern, 'gi');
      const matches = content.match(regex);

      if (matches) {
        // Check if any safe exceptions apply
        let isSafe = false;
        for (const exception of SAFE_EXCEPTIONS) {
          const exceptionRegex = new RegExp(exception, 'gi');
          if (content.match(exceptionRegex)) {
            isSafe = true;
            break;
          }
        }

        if (!isSafe) {
          findings.push({
            pattern: pattern,
            matches: matches,
            lines: getLineNumbers(content, regex),
          });
        }
      }
    }

    return findings;
  } catch (error) {
    console.error(`Error reading file ${filePath}:`, error.message);
    return [];
  }
}

function getLineNumbers(content, regex) {
  const lines = content.split('\n');
  const lineNumbers = [];

  lines.forEach((line, index) => {
    if (regex.test(line)) {
      lineNumbers.push(index + 1);
    }
  });

  return lineNumbers;
}

function checkWaivers(filePath, findings) {
  const waiversPath = path.join(
    path.dirname(filePath),
    '..',
    '..',
    'security',
    'migration-waivers.json',
  );

  try {
    if (fs.existsSync(waiversPath)) {
      const waivers = JSON.parse(fs.readFileSync(waiversPath, 'utf8'));
      const fileName = path.basename(filePath);

      if (waivers[fileName]) {
        const waiver = waivers[fileName];
        const now = new Date();
        const expiryDate = new Date(waiver.expires);

        if (now < expiryDate) {
          console.log(`✅ Waiver found for ${fileName}: ${waiver.reason}`);
          console.log(`   Approved by: ${waiver.approvedBy}`);
          console.log(`   Expires: ${waiver.expires}`);
          return true;
        } else {
          console.log(
            `⚠️  Waiver for ${fileName} has expired: ${waiver.expires}`,
          );
        }
      }
    }
  } catch (error) {
    console.log(`ℹ️  Could not read waivers file: ${error.message}`);
  }

  return false;
}

function generateWaiverTemplate(filePath, findings) {
  const fileName = path.basename(filePath);
  const template = {
    [fileName]: {
      reason: 'REQUIRED: Explain why this destructive operation is necessary',
      mitigations: [
        'REQUIRED: List mitigation steps taken',
        'e.g., Data backed up to table_backup_YYYYMMDD',
        'e.g., Rollback procedure documented in runbook',
      ],
      approvedBy: 'REQUIRED: Security team member or DBA',
      approvedDate: new Date().toISOString().split('T')[0],
      expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split('T')[0], // 30 days
      issue: 'REQUIRED: Link to approval issue or ticket',
    },
  };

  console.log('\n📝 Waiver template:');
  console.log('Add to security/migration-waivers.json:');
  console.log(JSON.stringify(template, null, 2));
}

function main() {
  const migrationsDir = process.argv[2];

  if (!migrationsDir) {
    console.error(
      'Usage: node scripts/check-destructive-sql.js <migrations-directory>',
    );
    process.exit(1);
  }

  if (!fs.existsSync(migrationsDir)) {
    console.error(`❌ Directory not found: ${migrationsDir}`);
    process.exit(1);
  }

  console.log(
    `🔍 Scanning for destructive SQL operations in: ${migrationsDir}`,
  );

  const files = fs
    .readdirSync(migrationsDir)
    .filter(
      (file) =>
        file.endsWith('.sql') || file.endsWith('.ts') || file.endsWith('.js'),
    )
    .sort();

  if (files.length === 0) {
    console.log('ℹ️  No migration files found');
    process.exit(0);
  }

  let hasDestructiveOperations = false;

  for (const file of files) {
    const filePath = path.join(migrationsDir, file);
    const findings = analyzeFile(filePath);

    if (findings.length > 0) {
      console.log(`\n⚠️  Destructive operations detected in: ${file}`);

      findings.forEach((finding) => {
        console.log(`   Pattern: ${finding.pattern}`);
        console.log(`   Lines: ${finding.lines.join(', ')}`);
        console.log(`   Matches: ${finding.matches.join(', ')}`);
      });

      // Check for waivers
      const hasWaiver = checkWaivers(filePath, findings);

      if (!hasWaiver) {
        hasDestructiveOperations = true;
        generateWaiverTemplate(filePath, findings);
      }
    }
  }

  if (hasDestructiveOperations) {
    console.log('\n❌ DESTRUCTIVE OPERATIONS DETECTED WITHOUT WAIVERS');
    console.log('\nTo proceed, you must:');
    console.log('1. Add a waiver entry to security/migration-waivers.json');
    console.log('2. Get approval from security team or DBA');
    console.log('3. Document rollback procedures');
    console.log('4. Ensure data backup/migration procedures are in place');
    console.log('\nThis is a safety gate to prevent accidental data loss.');
    process.exit(1);
  } else {
    console.log(
      '\n✅ No destructive operations detected or all operations have valid waivers',
    );
    console.log(`Scanned ${files.length} migration files`);
    process.exit(0);
  }
}

// Helper function to create waiver directory and file if they don't exist
function ensureWaiverStructure() {
  const securityDir = path.join(__dirname, '..', 'security');
  const waiversFile = path.join(securityDir, 'migration-waivers.json');

  if (!fs.existsSync(securityDir)) {
    fs.mkdirSync(securityDir, { recursive: true });
  }

  if (!fs.existsSync(waiversFile)) {
    fs.writeFileSync(waiversFile, JSON.stringify({}, null, 2));
  }
}

// Create security structure if it doesn't exist
ensureWaiverStructure();

// Run the main function
main();

#!/usr/bin/env node

/**
 * Crypto Hygiene Checker
 *
 * Validates:
 * 1. No hardcoded cryptographic keys or secrets
 * 2. Only approved cryptographic algorithms are used
 * 3. Secrets are fetched from environment variables or secret stores
 * 4. Proper key rotation policies are in place
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// FIPS 140-2 and industry approved algorithms
const APPROVED_ALGORITHMS = {
  symmetric: [
    'aes-256-gcm',
    'aes-256-cbc',
    'aes-192-gcm',
    'aes-192-cbc',
    'aes-128-gcm',
    'aes-128-cbc',
  ],
  asymmetric: [
    'rsa',
    'RSA-OAEP',
    'RSA-OAEP-256',
    'RSA-PSS',
    'ECDSA',
    'ECDH',
    'Ed25519',
    'X25519',
  ],
  hash: [
    'sha256',
    'sha384',
    'sha512',
    'sha3-256',
    'sha3-384',
    'sha3-512',
    'blake2b512',
    'blake2s256',
  ],
  kdf: [
    'pbkdf2',
    'scrypt',
    'argon2',
    'hkdf',
  ],
};

// Deprecated/insecure algorithms
const DEPRECATED_ALGORITHMS = [
  'md5',
  'sha1',
  'des',
  'des-ede3',
  '3des',
  'rc4',
  'rc2',
  'blowfish',
  'aes-128-ecb',
  'aes-192-ecb',
  'aes-256-ecb',
];

const FINDINGS = {
  errors: [],
  warnings: [],
  info: [],
};

/**
 * Check for hardcoded secrets in code
 */
function checkHardcodedSecrets() {
  console.log('🔍 Checking for hardcoded secrets...');

  const patterns = [
    // Private keys
    { pattern: /-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----/, type: 'Private Key', severity: 'error' },

    // AWS credentials
    { pattern: /AKIA[0-9A-Z]{16}/, type: 'AWS Access Key', severity: 'error' },
    { pattern: /aws_secret_access_key\s*=\s*['""][^'""]+['"]/, type: 'AWS Secret', severity: 'error' },

    // API Keys (generic long alphanumeric strings assigned to key-like variables)
    { pattern: /(api[_-]?key|apikey|api[_-]?secret)\s*[:=]\s*['""](?!process\.env|YOUR_|REPLACE_|TEST_|EXAMPLE_|XXX)[A-Za-z0-9+/]{20,}['"]/, type: 'API Key', severity: 'error' },

    // JWT secrets
    { pattern: /(jwt[_-]?secret|token[_-]?secret)\s*[:=]\s*['""](?!process\.env|YOUR_|REPLACE_|TEST_|EXAMPLE_)[^'""]{20,}['"]/, type: 'JWT Secret', severity: 'error' },

    // Database passwords
    { pattern: /(db[_-]?password|database[_-]?password)\s*[:=]\s*['""](?!process\.env|YOUR_|REPLACE_|TEST_|EXAMPLE_)[^'""]+['"]/, type: 'Database Password', severity: 'error' },

    // Generic secret patterns
    { pattern: /secret\s*[:=]\s*['""](?!process\.env|YOUR_|REPLACE_|TEST_|EXAMPLE_|\$\{)[A-Za-z0-9+/=]{32,}['"]/, type: 'Generic Secret', severity: 'warning' },
  ];

  const excludeDirs = ['node_modules', 'dist', 'build', 'coverage', '.git', 'tests', '__tests__', 'fixtures', 'test-fixtures'];
  const includeExts = ['.ts', '.js', '.tsx', '.jsx', '.py', '.env.example'];

  try {
    // Find all relevant files
    const findCmd = `find . -type f \\( ${includeExts.map(ext => `-name "*${ext}"`).join(' -o ')} \\) ${excludeDirs.map(dir => `! -path "*/${dir}/*"`).join(' ')}`;
    const files = execSync(findCmd, { encoding: 'utf8' })
      .split('\n')
      .filter(f => f.trim());

    for (const file of files) {
      if (!fs.existsSync(file)) continue;

      const content = fs.readFileSync(file, 'utf8');

      for (const { pattern, type, severity } of patterns) {
        const matches = content.match(new RegExp(pattern, 'g'));
        if (matches) {
          const lines = content.split('\n');
          matches.forEach(match => {
            const lineNum = lines.findIndex(line => line.includes(match)) + 1;
            const finding = `${file}:${lineNum} - ${type} detected: ${match.substring(0, 50)}...`;

            if (severity === 'error') {
              FINDINGS.errors.push(finding);
            } else {
              FINDINGS.warnings.push(finding);
            }
          });
        }
      }
    }

    if (FINDINGS.errors.filter(e => e.includes('detected')).length === 0) {
      console.log('✅ No hardcoded secrets detected');
    }
  } catch (error) {
    console.error('Error checking hardcoded secrets:', error.message);
  }
}

/**
 * Check for approved cryptographic algorithms
 */
function checkCryptoAlgorithms() {
  console.log('🔍 Checking cryptographic algorithms...');

  try {
    // Search for crypto algorithm usage in code
    const cryptoFiles = execSync(
      `grep -r -l "crypto\\|cipher\\|encrypt\\|decrypt\\|hash" --include="*.ts" --include="*.js" --exclude-dir=node_modules --exclude-dir=dist --exclude-dir=coverage . || true`,
      { encoding: 'utf8' }
    ).split('\n').filter(f => f.trim());

    for (const file of cryptoFiles) {
      if (!fs.existsSync(file)) continue;

      const content = fs.readFileSync(file, 'utf8');

      // Check for deprecated algorithms
      for (const deprecated of DEPRECATED_ALGORITHMS) {
        const regex = new RegExp(`['"\`]${deprecated}['"\`]|algorithm.*${deprecated}`, 'gi');
        if (regex.test(content)) {
          const lines = content.split('\n');
          const lineNum = lines.findIndex(line => regex.test(line)) + 1;
          FINDINGS.errors.push(
            `${file}:${lineNum} - Deprecated/insecure algorithm: ${deprecated}`
          );
        }
      }

      // Check for createCipher (deprecated)
      if (content.includes('createCipher(') || content.includes('createDecipher(')) {
        const lines = content.split('\n');
        const lineNum = lines.findIndex(line => line.includes('createCipher')) + 1;
        FINDINGS.warnings.push(
          `${file}:${lineNum} - Using deprecated createCipher/createDecipher (use createCipheriv/createDecipheriv)`
        );
      }

      // Check for weak key sizes
      if (/rsa.*1024|keySize.*1024/.test(content)) {
        FINDINGS.errors.push(`${file} - Weak RSA key size detected (1024 bits)`);
      }
    }

    if (FINDINGS.errors.filter(e => e.includes('algorithm')).length === 0) {
      console.log('✅ No deprecated algorithms detected');
    }
  } catch (error) {
    console.error('Error checking crypto algorithms:', error.message);
  }
}

/**
 * Verify KMS/secret store usage
 */
function checkKMSUsage() {
  console.log('🔍 Checking KMS and secret store usage...');

  const kmsFiles = [
    'crypto/kms/hsm-adapter.ts',
    'services/crypto/kms.ts',
    'server/crypto/kms.ts',
  ];

  const foundKMS = kmsFiles.some(file => fs.existsSync(path.join(process.cwd(), file)));

  if (foundKMS) {
    console.log('✅ KMS implementation found');
    FINDINGS.info.push('KMS implementation present: crypto/kms/');

    // Check that encryption operations reference KMS
    try {
      const encryptUsages = execSync(
        `grep -r "encrypt\\|decrypt" --include="*.ts" --include="*.js" --exclude-dir=node_modules --exclude-dir=tests --exclude-dir=crypto . | grep -v "kms\\|KMS\\|process\\.env" || true`,
        { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 }
      );

      if (encryptUsages.trim()) {
        FINDINGS.warnings.push(
          'Some encryption operations may not be using KMS - review manually'
        );
      }
    } catch (error) {
      // Ignore grep errors
    }
  } else {
    FINDINGS.warnings.push('No KMS implementation detected');
  }

  // Check for environment variable usage for secrets
  try {
    const envUsage = execSync(
      `grep -r "process\\.env" --include="*.ts" --include="*.js" --exclude-dir=node_modules . | grep -i "key\\|secret\\|password\\|token" | wc -l`,
      { encoding: 'utf8' }
    ).trim();

    if (parseInt(envUsage) > 0) {
      console.log(`✅ Found ${envUsage} environment variable references for secrets`);
      FINDINGS.info.push(`Environment variables used for ${envUsage} secret references`);
    }
  } catch (error) {
    // Ignore
  }
}

/**
 * Check key rotation policies
 */
function checkKeyRotation() {
  console.log('🔍 Checking key rotation policies...');

  // Check if rotation is implemented in KMS adapter
  const kmsAdapter = path.join(process.cwd(), 'crypto/kms/hsm-adapter.ts');
  if (fs.existsSync(kmsAdapter)) {
    const content = fs.readFileSync(kmsAdapter, 'utf8');

    if (content.includes('rotateKey') || content.includes('rotation')) {
      console.log('✅ Key rotation implementation found in KMS adapter');
      FINDINGS.info.push('Key rotation implemented in HSM adapter');
    } else {
      FINDINGS.warnings.push('Key rotation not found in KMS adapter');
    }

    // Check for rotation schedule
    if (content.includes('rotationSchedule') || content.includes('intervalDays')) {
      console.log('✅ Rotation schedule configuration found');
    } else {
      FINDINGS.warnings.push('No rotation schedule configuration found');
    }
  }

  // Check SECURITY.md for rotation policy
  const securityMd = path.join(process.cwd(), 'SECURITY.md');
  if (fs.existsSync(securityMd)) {
    const content = fs.readFileSync(securityMd, 'utf8');
    if (/rotat(e|ion)|90.day|key.management/i.test(content)) {
      console.log('✅ Key rotation policy documented in SECURITY.md');
    } else {
      FINDINGS.warnings.push('Key rotation policy not documented in SECURITY.md');
    }
  }
}

/**
 * Generate report
 */
function generateReport() {
  console.log('\n' + '='.repeat(70));
  console.log('🔒 CRYPTO HYGIENE REPORT');
  console.log('='.repeat(70) + '\n');

  if (FINDINGS.errors.length > 0) {
    console.log('❌ ERRORS:');
    FINDINGS.errors.forEach(error => console.log(`  - ${error}`));
    console.log('');
  }

  if (FINDINGS.warnings.length > 0) {
    console.log('⚠️  WARNINGS:');
    FINDINGS.warnings.forEach(warning => console.log(`  - ${warning}`));
    console.log('');
  }

  if (FINDINGS.info.length > 0) {
    console.log('ℹ️  INFO:');
    FINDINGS.info.forEach(info => console.log(`  - ${info}`));
    console.log('');
  }

  console.log('='.repeat(70));

  if (FINDINGS.errors.length > 0) {
    console.log('\n❌ Crypto hygiene check FAILED');
    console.log(`Found ${FINDINGS.errors.length} error(s) that must be fixed.\n`);
    process.exit(1);
  } else if (FINDINGS.warnings.length > 0) {
    console.log('\n⚠️  Crypto hygiene check passed with warnings');
    console.log(`Found ${FINDINGS.warnings.length} warning(s) for review.\n`);
    // Don't fail on warnings, just report them
    process.exit(0);
  } else {
    console.log('\n✅ Crypto hygiene check PASSED\n');
    process.exit(0);
  }
}

// Run all checks
function main() {
  console.log('🚀 Starting Crypto Hygiene Checker\n');

  checkHardcodedSecrets();
  checkCryptoAlgorithms();
  checkKMSUsage();
  checkKeyRotation();
  generateReport();
}

main();

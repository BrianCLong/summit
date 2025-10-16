#!/usr/bin/env node
/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');
const YAML = require('yaml');

/**
 * Recursively walk directory and return all files
 */
function walk(dir) {
  if (!fs.existsSync(dir)) return [];

  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((d) => {
    const p = path.join(dir, d.name);
    return d.isDirectory() ? walk(p) : [p];
  });
}

/**
 * Check a values.yaml file for digest policy compliance
 */
function checkValuesYaml(filePath) {
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    const doc = YAML.parse(raw) || {};
    let errors = [];

    // Check image configuration
    if (doc.image) {
      errors = errors.concat(validateImageConfig(doc.image, 'image'));
    }

    // Check images array
    if (doc.images && Array.isArray(doc.images)) {
      doc.images.forEach((img, idx) => {
        errors = errors.concat(validateImageConfig(img, `images[${idx}]`));
      });
    }

    // Check nested image configurations
    errors = errors.concat(findNestedImages(doc, ''));

    return errors;
  } catch (error) {
    return [`Failed to parse YAML: ${error.message}`];
  }
}

/**
 * Validate individual image configuration
 */
function validateImageConfig(img, path) {
  const errors = [];
  const tag = (img.tag || '').toString().trim();
  const digest = (img.digest || '').toString().trim();

  // Check for mutable tags (must be empty)
  if (tag && tag !== '') {
    errors.push(
      `${path}: image.tag must be empty (found: "${tag}"). Use digest instead.`,
    );
  }

  // Check for required digest
  if (!digest) {
    errors.push(`${path}: image.digest sha256 is required`);
  } else if (!digest.startsWith('sha256:')) {
    if (digest === 'sha256:example123') {
      console.warn(
        `⚠️  ${path}: Using example digest - replace with actual digest from CI`,
      );
    } else {
      errors.push(
        `${path}: image.digest must start with 'sha256:' (found: "${digest}")`,
      );
    }
  }

  // Check repository is present
  if (!img.repository) {
    errors.push(`${path}: image.repository is required`);
  }

  return errors;
}

/**
 * Find nested image configurations in the document
 */
function findNestedImages(obj, basePath) {
  let errors = [];

  if (typeof obj !== 'object' || obj === null || Array.isArray(obj)) {
    return errors;
  }

  for (const [key, value] of Object.entries(obj)) {
    const currentPath = basePath ? `${basePath}.${key}` : key;

    if (key === 'image' && typeof value === 'object' && !Array.isArray(value)) {
      errors = errors.concat(validateImageConfig(value, currentPath));
    } else if (typeof value === 'object') {
      errors = errors.concat(findNestedImages(value, currentPath));
    }
  }

  return errors;
}

/**
 * Main execution
 */
function main() {
  console.log('🔍 Checking Helm charts for digest-only policy compliance...');

  const chartsDir = 'charts';
  if (!fs.existsSync(chartsDir)) {
    console.log('📁 No charts/ directory found — skipping policy check');
    process.exit(0);
  }

  // Find all values.yaml files
  const files = walk(chartsDir).filter((p) => {
    return p.match(/values.*\.ya?ml$/i);
  });

  if (files.length === 0) {
    console.log('📁 No values.yaml files found in charts/ directory');
    process.exit(0);
  }

  let failed = false;
  let totalErrors = 0;

  console.log(`📄 Found ${files.length} values files to check...\n`);

  for (const file of files) {
    const errors = checkValuesYaml(file);

    if (errors.length > 0) {
      failed = true;
      totalErrors += errors.length;
      console.log(`❌ ${file}:`);
      for (const error of errors) {
        console.log(`   ${error}`);
      }
      console.log('');
    } else {
      console.log(`✅ ${file}`);
    }
  }

  console.log('\n📊 Policy Check Summary:');
  console.log(`Files checked: ${files.length}`);
  console.log(`Policy violations: ${totalErrors}`);

  if (failed) {
    console.log('\n❌ Helm digest policy check FAILED');
    console.log('🔧 To fix:');
    console.log('  1. Remove or comment out all image.tag fields');
    console.log('  2. Set image.digest to actual sha256 hash from CI');
    console.log('  3. Ensure image.repository is present');
    process.exit(1);
  } else {
    console.log('\n✅ All Helm charts comply with digest-only policy!');
    process.exit(0);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = {
  checkValuesYaml,
  validateImageConfig,
  walk,
};

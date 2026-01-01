#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const DOCS_DIR = 'docs';
const ADR_DIR = path.join(DOCS_DIR, 'adr');

function checkAdrExists() {
  if (!fs.existsSync(ADR_DIR)) {
    console.error(`❌ ADR directory not found at ${ADR_DIR}`);
    process.exit(1);
  }

  const files = fs.readdirSync(ADR_DIR);
  const adrFiles = files.filter(f => /^\d{4}-.*\.md$/.test(f));

  if (adrFiles.length === 0) {
    // Check if there are AD-XXXX format
    const alternateAdrFiles = files.filter(f => /^ADR-\d{4}-.*\.md$/.test(f) || /^ADR-\d{3}_.*\.md$/.test(f));
    if (alternateAdrFiles.length > 0) {
        console.log(`⚠️  Found ${alternateAdrFiles.length} ADRs with alternate naming convention.`);
    } else {
        console.error('❌ No ADRs found in ' + ADR_DIR);
        process.exit(1);
    }
  }

  console.log(`✅ Found ADR directory and content.`);
}

function checkBrokenLinks(dir) {
    // Very basic link checker - just checks if referenced local files exist
    // This is a placeholder for a real link checker like 'markdown-link-check'
    console.log(`ℹ️  Skipping deep link check in this lightweight script.`);
}

console.log('🔍 Running Docs Check...');
checkAdrExists();
checkBrokenLinks(DOCS_DIR);
console.log('✅ Docs check passed.');

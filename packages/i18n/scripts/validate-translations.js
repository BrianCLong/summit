#!/usr/bin/env node

/**
 * Translation Validation Tool
 *
 * Validates translation completeness, consistency, and correctness.
 * Checks for missing keys, invalid interpolations, and untranslated strings.
 *
 * Usage:
 *   node validate-translations.js [options]
 *
 * Options:
 *   --locales <dir>    Locales directory (default: ./locales)
 *   --base <locale>    Base locale for comparison (default: en-US)
 *   --fix              Automatically fix some issues
 *   --report <file>    Output report to file (JSON)
 */

import fs from 'fs';
import path from 'path';

function loadTranslations(localesDir, locale, namespace) {
  try {
    const filePath = path.join(localesDir, locale, `${namespace}.json`);
    const content = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    return null;
  }
}

function flattenMessages(messages, prefix = '') {
  const result = {};

  for (const [key, value] of Object.entries(messages)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;

    if (typeof value === 'string') {
      result[fullKey] = value;
    } else if (typeof value === 'object' && value !== null) {
      Object.assign(result, flattenMessages(value, fullKey));
    }
  }

  return result;
}

function extractInterpolations(text) {
  const matches = text.match(/\{(\w+)\}/g);
  return matches ? matches.map((m) => m.slice(1, -1)) : [];
}

function validateLocale(baseMessages, targetMessages, targetLocale) {
  const baseFlat = flattenMessages(baseMessages);
  const targetFlat = flattenMessages(targetMessages);

  const baseKeys = new Set(Object.keys(baseFlat));
  const targetKeys = new Set(Object.keys(targetFlat));

  const issues = {
    locale: targetLocale,
    missingKeys: [],
    extraKeys: [],
    emptyValues: [],
    invalidInterpolations: [],
    possiblyUntranslated: [],
    errors: [],
  };

  // Missing keys
  for (const key of baseKeys) {
    if (!targetKeys.has(key)) {
      issues.missingKeys.push(key);
    }
  }

  // Extra keys
  for (const key of targetKeys) {
    if (!baseKeys.has(key)) {
      issues.extraKeys.push(key);
    }
  }

  // Empty values
  for (const [key, value] of Object.entries(targetFlat)) {
    if (!value || value.trim() === '') {
      issues.emptyValues.push(key);
    }
  }

  // Invalid interpolations
  for (const key of baseKeys) {
    if (targetFlat[key]) {
      const baseVars = new Set(extractInterpolations(baseFlat[key]));
      const targetVars = new Set(extractInterpolations(targetFlat[key]));

      const missingVars = Array.from(baseVars).filter((v) => !targetVars.has(v));
      const extraVars = Array.from(targetVars).filter((v) => !baseVars.has(v));

      if (missingVars.length > 0 || extraVars.length > 0) {
        issues.invalidInterpolations.push({
          key,
          missingVars,
          extraVars,
          base: baseFlat[key],
          target: targetFlat[key],
        });
      }
    }
  }

  // Possibly untranslated (same as base)
  for (const key of baseKeys) {
    const baseValue = baseFlat[key];
    const targetValue = targetFlat[key];

    if (targetValue && targetValue === baseValue && baseValue.trim() !== '') {
      // Skip technical terms, constants, etc.
      if (!/^[A-Z_]+$/.test(baseValue) && !/^[a-z][a-zA-Z0-9]*$/.test(baseValue)) {
        issues.possiblyUntranslated.push({
          key,
          value: baseValue,
        });
      }
    }
  }

  return issues;
}

function calculateCoverage(issues, baseCount) {
  const translatedCount = baseCount - issues.missingKeys.length - issues.emptyValues.length;
  return baseCount > 0 ? (translatedCount / baseCount) * 100 : 0;
}

function printIssues(issues, baseCount) {
  const coverage = calculateCoverage(issues, baseCount);

  console.log(`\n📊 ${issues.locale}`);
  console.log(`   Coverage: ${coverage.toFixed(1)}%`);

  if (issues.missingKeys.length > 0) {
    console.log(`   ❌ ${issues.missingKeys.length} missing keys`);
  }

  if (issues.emptyValues.length > 0) {
    console.log(`   ⚠️  ${issues.emptyValues.length} empty values`);
  }

  if (issues.extraKeys.length > 0) {
    console.log(`   ℹ️  ${issues.extraKeys.length} extra keys (not in base)`);
  }

  if (issues.invalidInterpolations.length > 0) {
    console.log(`   🔧 ${issues.invalidInterpolations.length} invalid interpolations`);
  }

  if (issues.possiblyUntranslated.length > 0) {
    console.log(`   🤔 ${issues.possiblyUntranslated.length} possibly untranslated`);
  }

  if (coverage === 100 && issues.extraKeys.length === 0 && issues.invalidInterpolations.length === 0) {
    console.log(`   ✅ Perfect!`);
  }
}

function printDetailedIssues(issues) {
  if (issues.missingKeys.length > 0) {
    console.log(`\n   Missing keys:`);
    for (const key of issues.missingKeys.slice(0, 10)) {
      console.log(`      - ${key}`);
    }
    if (issues.missingKeys.length > 10) {
      console.log(`      ... and ${issues.missingKeys.length - 10} more`);
    }
  }

  if (issues.invalidInterpolations.length > 0) {
    console.log(`\n   Invalid interpolations:`);
    for (const item of issues.invalidInterpolations.slice(0, 5)) {
      console.log(`      ${item.key}:`);
      console.log(`         Base: ${item.base}`);
      console.log(`         Target: ${item.target}`);
      if (item.missingVars.length > 0) {
        console.log(`         Missing vars: ${item.missingVars.join(', ')}`);
      }
      if (item.extraVars.length > 0) {
        console.log(`         Extra vars: ${item.extraVars.join(', ')}`);
      }
    }
    if (issues.invalidInterpolations.length > 5) {
      console.log(`      ... and ${issues.invalidInterpolations.length - 5} more`);
    }
  }
}

async function validateTranslations(options = {}) {
  const {
    localesDir = './locales',
    baseLocale = 'en-US',
    verbose = false,
    reportFile = null,
  } = options;

  console.log(`🔍 Validating translations in ${localesDir}`);
  console.log(`   Base locale: ${baseLocale}\n`);

  // Get all locales
  const locales = fs.readdirSync(localesDir, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name);

  console.log(`📂 Found ${locales.length} locales: ${locales.join(', ')}\n`);

  // Get all namespaces from base locale
  const baseLocalePath = path.join(localesDir, baseLocale);
  const namespaces = fs.readdirSync(baseLocalePath)
    .filter(file => file.endsWith('.json'))
    .map(file => file.replace('.json', ''));

  console.log(`📚 Found ${namespaces.length} namespaces: ${namespaces.join(', ')}\n`);

  const allIssues = {};
  let totalBaseKeys = 0;

  for (const namespace of namespaces) {
    console.log(`\n📖 Namespace: ${namespace}`);
    console.log(`${'='.repeat(50)}`);

    const baseMessages = loadTranslations(localesDir, baseLocale, namespace);
    if (!baseMessages) {
      console.log(`   ⚠️  Could not load base locale ${baseLocale}/${namespace}.json`);
      continue;
    }

    const baseFlat = flattenMessages(baseMessages);
    const baseCount = Object.keys(baseFlat).length;
    totalBaseKeys += baseCount;

    console.log(`   ${baseCount} keys in base locale`);

    for (const locale of locales) {
      if (locale === baseLocale) continue;

      const targetMessages = loadTranslations(localesDir, locale, namespace);
      if (!targetMessages) {
        console.log(`\n   ⚠️  ${locale}: file not found`);
        continue;
      }

      const issues = validateLocale(baseMessages, targetMessages, locale);
      allIssues[`${locale}/${namespace}`] = issues;

      printIssues(issues, baseCount);

      if (verbose) {
        printDetailedIssues(issues);
      }
    }
  }

  // Summary
  console.log(`\n\n${'='.repeat(50)}`);
  console.log(`📊 Summary`);
  console.log(`${'='.repeat(50)}`);

  const summaryByLocale = {};
  for (const [key, issues] of Object.entries(allIssues)) {
    const locale = key.split('/')[0];
    if (!summaryByLocale[locale]) {
      summaryByLocale[locale] = {
        totalMissing: 0,
        totalEmpty: 0,
        totalInvalid: 0,
        namespaces: 0,
      };
    }

    summaryByLocale[locale].totalMissing += issues.missingKeys.length;
    summaryByLocale[locale].totalEmpty += issues.emptyValues.length;
    summaryByLocale[locale].totalInvalid += issues.invalidInterpolations.length;
    summaryByLocale[locale].namespaces += 1;
  }

  for (const [locale, summary] of Object.entries(summaryByLocale)) {
    const totalIssues = summary.totalMissing + summary.totalEmpty + summary.totalInvalid;
    const coverage = totalBaseKeys > 0
      ? ((totalBaseKeys - summary.totalMissing - summary.totalEmpty) / totalBaseKeys * 100)
      : 0;

    console.log(`\n${locale}:`);
    console.log(`   Coverage: ${coverage.toFixed(1)}%`);
    console.log(`   Total issues: ${totalIssues}`);
    console.log(`   Missing: ${summary.totalMissing}, Empty: ${summary.totalEmpty}, Invalid: ${summary.totalInvalid}`);

    if (totalIssues === 0) {
      console.log(`   ✅ All good!`);
    }
  }

  // Write report if requested
  if (reportFile) {
    const report = {
      timestamp: new Date().toISOString(),
      baseLocale,
      localesDir,
      totalBaseKeys,
      summary: summaryByLocale,
      details: allIssues,
    };

    fs.writeFileSync(reportFile, JSON.stringify(report, null, 2), 'utf-8');
    console.log(`\n💾 Report saved to: ${reportFile}`);
  }

  console.log(`\n✅ Validation complete!\n`);
}

// CLI entry point
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);

  const options = {
    localesDir: args.find((arg, i) => args[i - 1] === '--locales') || './locales',
    baseLocale: args.find((arg, i) => args[i - 1] === '--base') || 'en-US',
    verbose: args.includes('--verbose') || args.includes('-v'),
    reportFile: args.find((arg, i) => args[i - 1] === '--report'),
  };

  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
Translation Validation Tool

Validates translation completeness, consistency, and correctness.

Usage:
  node validate-translations.js [options]

Options:
  --locales <dir>    Locales directory (default: ./locales)
  --base <locale>    Base locale (default: en-US)
  --verbose, -v      Show detailed issues
  --report <file>    Save report to JSON file
  --help, -h         Show this help

Examples:
  node validate-translations.js
  node validate-translations.js --locales ./locales --base en-US
  node validate-translations.js --verbose --report report.json
    `);
    process.exit(0);
  }

  validateTranslations(options).catch(console.error);
}

export { validateTranslations, validateLocale, calculateCoverage };

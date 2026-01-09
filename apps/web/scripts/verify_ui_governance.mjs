#!/usr/bin/env node
/**
 * UI Governance Verification Script
 *
 * Scans apps/web source files for governance violations:
 * - Hard-coded hex colors
 * - Inline style objects with color properties (unless waived)
 * - Raw <button> elements where Button primitive should be used
 *
 * Supports waivers via ui-governance.allowlist.json
 * Supports baseline comparison to prevent new violations while allowing existing ones.
 * Fails if waivers are expired.
 *
 * Usage:
 *   node scripts/verify_ui_governance.mjs [--json] [--strict] [--update-baseline]
 *
 * Modes:
 *   (default)         Report violations, exit 0 unless expired waivers
 *   --strict          Fail if violations exceed baseline
 *   --update-baseline Update the baseline file with current counts
 */

import { readFileSync, readdirSync, statSync, existsSync, writeFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { dirname } from 'node:path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const ROOT = join(__dirname, '..')
const SRC_DIR = join(ROOT, 'src')
const ALLOWLIST_PATH = join(ROOT, 'ui-governance.allowlist.json')
const BASELINE_PATH = join(ROOT, 'ui-governance.baseline.json')

// Violation rules
const RULES = {
  'no-hardcoded-colors': {
    // Match hex colors like #fff, #ffffff, #ffffffff (3, 6, or 8 chars)
    pattern: /#([0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})\b/g,
    message: 'Hard-coded hex color detected',
    fix: 'Use Tailwind class (bg-*, text-*) or CSS variable var(--ds-color-*)',
    // Exclude CSS/SCSS files, config files, and test fixtures
    excludePatterns: [/\.css$/, /\.scss$/, /config\.(js|ts)$/, /\.test\.(ts|tsx)$/, /__fixtures__/],
  },
  'no-inline-color-styles': {
    // Match style objects with color properties
    pattern: /style\s*=\s*\{\s*\{[^}]*(?:color|backgroundColor|borderColor)\s*:/g,
    message: 'Inline style with color property detected',
    fix: 'Use Tailwind class or CSS variable var(--ds-color-*)',
    excludePatterns: [/\.test\.(ts|tsx)$/, /__fixtures__/],
  },
  'prefer-button-primitive': {
    // Match raw <button elements not using Button component
    // Heuristic: <button with className that looks like custom styling
    pattern: /<button\s+(?![^>]*(?:disabled|type="submit"|type="button"|type="reset")[^>]*>)[^>]*className\s*=\s*["'][^"']*(?:bg-|text-|px-|py-|rounded)[^"']*["'][^>]*>/g,
    message: 'Raw <button> with styling detected',
    fix: 'Import and use Button from @/components/ui/Button',
    excludePatterns: [/Button\.tsx$/, /\.test\.(ts|tsx)$/, /__fixtures__/, /stories\.tsx$/],
  },
}

/**
 * Load and validate allowlist
 */
function loadAllowlist() {
  if (!existsSync(ALLOWLIST_PATH)) {
    return { waivers: [] }
  }
  try {
    const content = readFileSync(ALLOWLIST_PATH, 'utf-8')
    return JSON.parse(content)
  } catch (e) {
    console.error(`Failed to parse allowlist: ${e.message}`)
    process.exit(1)
  }
}

/**
 * Check if a waiver is expired
 */
function isWaiverExpired(waiver) {
  const now = new Date()
  const expires = new Date(waiver.expires)
  return expires < now
}

/**
 * Check if file+rule is waived
 */
function isWaived(filePath, ruleId, waivers) {
  const relPath = relative(ROOT, filePath)
  return waivers.find(
    (w) => w.file === relPath && w.rule === ruleId && !isWaiverExpired(w)
  )
}

/**
 * Get all source files recursively
 */
function getSourceFiles(dir, files = []) {
  if (!existsSync(dir)) return files

  const entries = readdirSync(dir)
  for (const entry of entries) {
    const fullPath = join(dir, entry)
    const stat = statSync(fullPath)
    if (stat.isDirectory()) {
      // Skip node_modules, dist, coverage
      if (!['node_modules', 'dist', 'coverage', '.git'].includes(entry)) {
        getSourceFiles(fullPath, files)
      }
    } else if (/\.(tsx?|jsx?)$/.test(entry)) {
      files.push(fullPath)
    }
  }
  return files
}

/**
 * Scan a file for violations
 */
function scanFile(filePath, rule, ruleId) {
  const relPath = relative(ROOT, filePath)

  // Check exclude patterns
  for (const pattern of rule.excludePatterns || []) {
    if (pattern.test(relPath)) {
      return []
    }
  }

  const content = readFileSync(filePath, 'utf-8')
  const lines = content.split('\n')
  const violations = []

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const lineNum = i + 1

    // Reset regex lastIndex
    rule.pattern.lastIndex = 0
    let match
    while ((match = rule.pattern.exec(line)) !== null) {
      violations.push({
        file: relPath,
        line: lineNum,
        column: match.index + 1,
        rule: ruleId,
        message: rule.message,
        fix: rule.fix,
        match: match[0].slice(0, 50), // Truncate for display
      })
    }
  }

  return violations
}

/**
 * Load baseline
 */
function loadBaseline() {
  if (!existsSync(BASELINE_PATH)) {
    return null
  }
  try {
    const content = readFileSync(BASELINE_PATH, 'utf-8')
    return JSON.parse(content)
  } catch (e) {
    console.error(`Failed to parse baseline: ${e.message}`)
    return null
  }
}

/**
 * Update baseline file
 */
function updateBaseline(violationsByRule, total) {
  const baseline = {
    '$schema': './scripts/ui-governance.baseline.schema.json',
    version: '1.0.0',
    description: 'Baseline of known UI governance violations. New violations above this count will fail CI.',
    generatedAt: new Date().toISOString(),
    baseline: violationsByRule,
    totalViolations: total,
  }
  writeFileSync(BASELINE_PATH, JSON.stringify(baseline, null, 2) + '\n')
  console.log(`\n✅ Baseline updated: ${BASELINE_PATH}\n`)
}

/**
 * Main verification logic
 */
function verify() {
  const args = process.argv.slice(2)
  const jsonOutput = args.includes('--json')
  const strictMode = args.includes('--strict')
  const updateBaselineMode = args.includes('--update-baseline')

  const allowlist = loadAllowlist()
  const waivers = allowlist.waivers || []
  const baseline = loadBaseline()

  // Check for expired waivers - always a hard failure
  const expiredWaivers = waivers.filter(isWaiverExpired)
  if (expiredWaivers.length > 0) {
    console.error('\n❌ EXPIRED WAIVERS DETECTED:\n')
    for (const w of expiredWaivers) {
      console.error(`  ${w.file} [${w.rule}] expired ${w.expires}`)
      console.error(`    Owner: ${w.owner}`)
      console.error(`    Reason: ${w.reason}\n`)
    }
    console.error('Remove or extend expired waivers in ui-governance.allowlist.json\n')
    process.exit(1)
  }

  // Scan source files
  const files = getSourceFiles(SRC_DIR)
  const allViolations = []
  const violationsByRule = {}

  for (const file of files) {
    for (const [ruleId, rule] of Object.entries(RULES)) {
      const violations = scanFile(file, rule, ruleId)

      for (const v of violations) {
        // Check if waived
        const waiver = isWaived(file, ruleId, waivers)
        if (!waiver) {
          allViolations.push(v)
          violationsByRule[ruleId] = (violationsByRule[ruleId] || 0) + 1
        }
      }
    }
  }

  // Handle update-baseline mode
  if (updateBaselineMode) {
    updateBaseline(violationsByRule, allViolations.length)
    return 0
  }

  // Compare against baseline
  let newViolations = 0
  let baselineComparison = {}
  if (baseline) {
    for (const [ruleId, count] of Object.entries(violationsByRule)) {
      const baselineCount = baseline.baseline[ruleId] || 0
      const delta = count - baselineCount
      baselineComparison[ruleId] = { current: count, baseline: baselineCount, delta }
      if (delta > 0) {
        newViolations += delta
      }
    }
  }

  // Output results
  if (jsonOutput) {
    console.log(JSON.stringify({
      success: strictMode ? newViolations === 0 : true,
      violations: allViolations,
      violationsByRule,
      baselineComparison,
      newViolations,
      waiverCount: waivers.length,
      filesScanned: files.length,
      mode: strictMode ? 'strict' : 'advisory',
    }, null, 2))
  } else {
    console.log('\n🔍 UI Governance Check\n')
    console.log(`   Mode: ${strictMode ? 'strict' : 'advisory'}`)
    console.log(`   Files scanned: ${files.length}`)
    console.log(`   Active waivers: ${waivers.length}`)
    console.log('')

    if (allViolations.length === 0) {
      console.log('✅ No violations found\n')
    } else {
      console.log(`📊 Violations by rule:`)
      for (const [ruleId, count] of Object.entries(violationsByRule)) {
        const comp = baselineComparison[ruleId]
        if (comp) {
          const deltaStr = comp.delta > 0 ? ` (+${comp.delta} new)` : comp.delta < 0 ? ` (${comp.delta} fixed!)` : ' (unchanged)'
          console.log(`   ${ruleId}: ${count}${deltaStr}`)
        } else {
          console.log(`   ${ruleId}: ${count}`)
        }
      }
      console.log(`   Total: ${allViolations.length}`)
      console.log('')

      if (baseline && newViolations > 0) {
        console.log(`⚠️  ${newViolations} NEW violation(s) above baseline!\n`)

        // Show only first 10 violations
        const sample = allViolations.slice(0, 10)
        for (const v of sample) {
          console.log(`  ${v.file}:${v.line}:${v.column}`)
          console.log(`    Rule: ${v.rule}`)
          console.log(`    ${v.message}`)
          console.log(`    Fix: ${v.fix}`)
          console.log('')
        }
        if (allViolations.length > 10) {
          console.log(`  ... and ${allViolations.length - 10} more. Run with --json for full list.\n`)
        }
      } else if (baseline) {
        console.log('✅ No new violations above baseline\n')
      }

      if (!strictMode) {
        console.log('ℹ️  Advisory mode: not failing build. Use --strict to enforce.\n')
      }

      console.log('To waive a violation, add an entry to ui-governance.allowlist.json:')
      console.log(JSON.stringify({
        file: '<relative-path>',
        rule: '<rule-id>',
        reason: '<justification>',
        owner: '<email>',
        expires: '<YYYY-MM-DD>',
      }, null, 2))
      console.log('')
    }
  }

  // Exit code logic
  if (strictMode && baseline && newViolations > 0) {
    return 1
  }
  return 0
}

process.exit(verify())

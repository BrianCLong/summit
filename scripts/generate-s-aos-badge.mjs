#!/usr/bin/env node

/**
 * S-AOS Badge Generator
 *
 * Generates shields.io style badges for S-AOS compliance metrics.
 * Can generate static SVG badges or dynamic endpoint URLs.
 *
 * Usage:
 *   node scripts/generate-s-aos-badge.mjs --type=compliance --score=95
 *   node scripts/generate-s-aos-badge.mjs --type=coverage --percent=87
 *   node scripts/generate-s-aos-badge.mjs --type=calibration --f1=0.75
 */

import fs from 'fs/promises';

// Parse arguments
const args = process.argv.slice(2).reduce((acc, arg) => {
  const [key, value] = arg.replace('--', '').split('=');
  acc[key] = value;
  return acc;
}, {});

const TYPE = args.type || 'compliance';
const OUTPUT = args.output || 'badge.svg';

// ============================================================================
// Badge Templates
// ============================================================================

function generateSVGBadge(label, value, color) {
  const labelWidth = label.length * 7 + 10;
  const valueWidth = value.length * 7 + 10;
  const totalWidth = labelWidth + valueWidth;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${totalWidth}" height="20">
  <linearGradient id="b" x2="0" y2="100%">
    <stop offset="0" stop-color="#bbb" stop-opacity=".1"/>
    <stop offset="1" stop-opacity=".1"/>
  </linearGradient>
  <clipPath id="a">
    <rect width="${totalWidth}" height="20" rx="3" fill="#fff"/>
  </clipPath>
  <g clip-path="url(#a)">
    <path fill="#555" d="M0 0h${labelWidth}v20H0z"/>
    <path fill="${color}" d="M${labelWidth} 0h${valueWidth}v20H${labelWidth}z"/>
    <path fill="url(#b)" d="M0 0h${totalWidth}v20H0z"/>
  </g>
  <g fill="#fff" text-anchor="middle" font-family="DejaVu Sans,Verdana,Geneva,sans-serif" font-size="11">
    <text x="${labelWidth / 2}" y="15" fill="#010101" fill-opacity=".3">${label}</text>
    <text x="${labelWidth / 2}" y="14">${label}</text>
    <text x="${labelWidth + valueWidth / 2}" y="15" fill="#010101" fill-opacity=".3">${value}</text>
    <text x="${labelWidth + valueWidth / 2}" y="14">${value}</text>
  </g>
</svg>`;
}

function getColor(type, value) {
  if (type === 'compliance' || type === 'coverage') {
    // Percentage-based
    const percent = parseInt(value, 10);
    if (percent >= 95) return '#4c1';
    if (percent >= 85) return '#97ca00';
    if (percent >= 75) return '#dfb317';
    if (percent >= 50) return '#fe7d37';
    return '#e05d44';
  }

  if (type === 'calibration') {
    // F1 score based
    const f1 = parseFloat(value);
    if (f1 >= 0.75) return '#4c1';
    if (f1 >= 0.50) return '#dfb317';
    return '#e05d44';
  }

  if (type === 'health') {
    if (value === 'HEALTHY') return '#4c1';
    if (value === 'NEEDS_ATTENTION') return '#dfb317';
    return '#e05d44';
  }

  return '#555';
}

// ============================================================================
// Badge Generators
// ============================================================================

async function generateComplianceBadge(score) {
  const label = 'S-AOS compliance';
  const value = `${score}%`;
  const color = getColor('compliance', score);

  return generateSVGBadge(label, value, color);
}

async function generateCoverageBadge(percent) {
  const label = 'commit compliance';
  const value = `${percent}%`;
  const color = getColor('coverage', percent);

  return generateSVGBadge(label, value, color);
}

async function generateCalibrationBadge(f1) {
  const label = 'entropy F1';
  const value = (f1 * 100).toFixed(1) + '%';
  const color = getColor('calibration', f1);

  return generateSVGBadge(label, value, color);
}

async function generateHealthBadge(health) {
  const label = 'S-AOS health';
  const value = health;
  const color = getColor('health', health);

  return generateSVGBadge(label, value, color);
}

async function generateAuditBadge(status) {
  const label = 'audit trail';
  const value = status ? 'verified' : 'not found';
  const color = status ? '#4c1' : '#e05d44';

  return generateSVGBadge(label, value, color);
}

// ============================================================================
// Shields.io URL Generator
// ============================================================================

function generateShieldsURL(type, data) {
  const baseURL = 'https://img.shields.io/badge';

  switch (type) {
    case 'compliance': {
      const score = data.score || 0;
      const color = score >= 95 ? 'brightgreen' : score >= 85 ? 'green' : score >= 75 ? 'yellow' : 'red';
      return `${baseURL}/S--AOS%20compliance-${score}%25-${color}`;
    }

    case 'coverage': {
      const percent = data.percent || 0;
      const color = percent >= 90 ? 'brightgreen' : percent >= 75 ? 'green' : 'yellow';
      return `${baseURL}/commit%20compliance-${percent}%25-${color}`;
    }

    case 'calibration': {
      const f1 = data.f1 || 0;
      const percent = (f1 * 100).toFixed(0);
      const color = f1 >= 0.75 ? 'brightgreen' : f1 >= 0.50 ? 'yellow' : 'red';
      return `${baseURL}/entropy%20F1-${percent}%25-${color}`;
    }

    case 'health': {
      const health = data.health || 'UNKNOWN';
      const color = health === 'HEALTHY' ? 'brightgreen' : health === 'NEEDS_ATTENTION' ? 'yellow' : 'red';
      return `${baseURL}/S--AOS%20health-${health}-${color}`;
    }

    case 'audit': {
      const status = data.status || false;
      const color = status ? 'brightgreen' : 'red';
      const value = status ? 'verified' : 'not%20found';
      return `${baseURL}/audit%20trail-${value}-${color}`;
    }

    default:
      return `${baseURL}/S--AOS-unknown-lightgrey`;
  }
}

// ============================================================================
// Main
// ============================================================================

async function main() {
  console.log('\n🏷️  S-AOS Badge Generator\n');

  let badge;
  let url;

  switch (TYPE) {
    case 'compliance': {
      const score = parseInt(args.score || '0', 10);
      console.log(`Generating compliance badge (score: ${score}%)...`);
      badge = await generateComplianceBadge(score);
      url = generateShieldsURL('compliance', { score });
      break;
    }

    case 'coverage': {
      const percent = parseInt(args.percent || '0', 10);
      console.log(`Generating coverage badge (${percent}%)...`);
      badge = await generateCoverageBadge(percent);
      url = generateShieldsURL('coverage', { percent });
      break;
    }

    case 'calibration': {
      const f1 = parseFloat(args.f1 || '0');
      console.log(`Generating calibration badge (F1: ${f1})...`);
      badge = await generateCalibrationBadge(f1);
      url = generateShieldsURL('calibration', { f1 });
      break;
    }

    case 'health': {
      const health = args.health || 'UNKNOWN';
      console.log(`Generating health badge (${health})...`);
      badge = await generateHealthBadge(health);
      url = generateShieldsURL('health', { health });
      break;
    }

    case 'audit': {
      const status = args.status === 'true';
      console.log(`Generating audit badge (${status ? 'verified' : 'not found'})...`);
      badge = await generateAuditBadge(status);
      url = generateShieldsURL('audit', { status });
      break;
    }

    default:
      console.error(`Unknown badge type: ${TYPE}`);
      console.log('\nAvailable types:');
      console.log('  - compliance  (--score=95)');
      console.log('  - coverage    (--percent=87)');
      console.log('  - calibration (--f1=0.75)');
      console.log('  - health      (--health=HEALTHY)');
      console.log('  - audit       (--status=true)');
      process.exit(1);
  }

  // Save SVG badge
  await fs.writeFile(OUTPUT, badge);
  console.log(`\n✅ Badge saved: ${OUTPUT}`);

  // Print shields.io URL
  console.log(`\n📎 Shields.io URL:`);
  console.log(`   ${url}`);

  console.log(`\n💡 Markdown:`);
  console.log(`   ![S-AOS ${TYPE}](${url})`);

  console.log(`\n💡 HTML:`);
  console.log(`   <img src="${url}" alt="S-AOS ${TYPE}" />`);

  console.log('\nDone!\n');
}

// ============================================================================
// CLI Help
// ============================================================================

if (args.help || args.h) {
  console.log(`
S-AOS Badge Generator

Usage:
  node scripts/generate-s-aos-badge.mjs --type=<type> [options]

Badge Types:
  compliance    Overall S-AOS compliance score (0-100%)
  coverage      Commit message compliance rate (0-100%)
  calibration   Entropy prediction F1 score (0.0-1.0)
  health        Overall system health status
  audit         Audit trail status (verified/not found)

Options:
  --type=<type>       Badge type (required)
  --score=<0-100>     Compliance score (for compliance badge)
  --percent=<0-100>   Coverage percentage (for coverage badge)
  --f1=<0.0-1.0>      F1 score (for calibration badge)
  --health=<status>   Health status: HEALTHY, NEEDS_ATTENTION, CRITICAL
  --status=<bool>     Audit status: true or false
  --output=<file>     Output file (default: badge.svg)

Examples:
  # Compliance badge
  node scripts/generate-s-aos-badge.mjs --type=compliance --score=95

  # Coverage badge
  node scripts/generate-s-aos-badge.mjs --type=coverage --percent=87

  # Calibration badge
  node scripts/generate-s-aos-badge.mjs --type=calibration --f1=0.75

  # Health badge
  node scripts/generate-s-aos-badge.mjs --type=health --health=HEALTHY

  # Audit badge
  node scripts/generate-s-aos-badge.mjs --type=audit --status=true

Output:
  - Saves SVG badge to specified file
  - Prints shields.io URL for dynamic badges
  - Provides markdown and HTML snippets
`);
  process.exit(0);
}

main().catch(error => {
  console.error('Badge generation failed:', error);
  process.exit(1);
});

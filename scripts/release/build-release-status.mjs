#!/usr/bin/env node
import { readFileSync, writeFileSync, appendFileSync, existsSync } from 'fs';
import { join } from 'path';
import { RELEASE_STATUS_BLOCKED, blockedReason } from './reason-codes.mjs';

const DIST_DIR = process.env.DIST_DIR || 'dist/release';
const OUT_FILE = join(DIST_DIR, 'release-status.json');

// Helper to read JSON
function readJson(filename) {
  const path = join(DIST_DIR, filename);
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch (e) {
    console.error(`Error reading ${filename}:`, e.message);
    return null;
  }
}

function main() {
  const statusObj = {
    tag: process.env.GITHUB_REF_NAME || 'unknown',
    channel: 'unknown',
    status: 'blocked',
    blockedReasons: [],
    checks: {},
    artifactsDir: DIST_DIR,
    run: {
      id: process.env.GITHUB_RUN_ID,
      url: process.env.GITHUB_SERVER_URL && process.env.GITHUB_REPOSITORY && process.env.GITHUB_RUN_ID
        ? `${process.env.GITHUB_SERVER_URL}/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}`
        : null
    },
    generatedAt: new Date().toISOString(),
  };

  // Try to determine channel from channel.json
  const channelData = readJson('channel.json');
  if (channelData && channelData.channel) {
    statusObj.channel = channelData.channel;
  } else {
     // Fallback inference
     if (statusObj.tag.includes('-rc')) statusObj.channel = 'rc';
     else if (statusObj.tag.startsWith('v')) statusObj.channel = 'ga';
  }

  // Required checks
  const requiredChecks = ['preflight', 'freeze', 'verify'];

  let allOk = true;

  for (const checkName of requiredChecks) {
    const filename = `${checkName}.json`;
    const data = readJson(filename);

    // Initialize check info
    statusObj.checks[checkName] = {
      ok: false,
      path: join(DIST_DIR, filename)
    };

    if (!data) {
      allOk = false;
      statusObj.blockedReasons.push(blockedReason(
        RELEASE_STATUS_BLOCKED.MISSING_ARTIFACTS,
        `Required check output missing: ${filename}`,
        { file: filename }
      ));
    } else {
      statusObj.checks[checkName].ok = !!data.ok;

      if (!data.ok) {
        allOk = false;
        // Determine code
        let code = data.code;
        if (!code) {
          switch(checkName) {
            case 'freeze': code = RELEASE_STATUS_BLOCKED.FREEZE_WINDOW; break;
            case 'verify': code = RELEASE_STATUS_BLOCKED.VERIFY_FAILED; break;
            case 'preflight': code = RELEASE_STATUS_BLOCKED.PREFLIGHT_ANCESTRY; break;
            default: code = RELEASE_STATUS_BLOCKED.UNKNOWN;
          }
        }

        statusObj.blockedReasons.push(blockedReason(
          code,
          data.message || data.error || `${checkName} check failed`,
          data
        ));
      }
    }
  }

  // Determine backport context
  let backportContext = null;
  const preflight = readJson('preflight.json');
  if (preflight) {
    if (preflight.ancestryAcceptedVia === 'series') {
      backportContext = {
        mode: 'series-branch',
        series: preflight.series,
        seriesBranch: preflight.seriesBranch,
        ancestryAcceptedVia: 'series'
      };
    } else if (preflight.ancestryAcceptedVia === 'default' || preflight.reachableFromDefaultBranch) {
      backportContext = {
        mode: 'default-branch',
        ancestryAcceptedVia: 'default'
      };
    }
  }

  if (backportContext) {
    statusObj.backportContext = backportContext;
  }

  if (allOk) {
    statusObj.status = 'ready';
  } else {
    statusObj.status = 'blocked';
  }

  // Write output
  try {
    writeFileSync(OUT_FILE, JSON.stringify(statusObj, null, 2));
    console.log(`Generated ${OUT_FILE}`);
  } catch(e) {
    console.error("Failed to write status file:", e);
    process.exit(1);
  }

  // One-line summary
  const summary = `Release status: ${statusObj.status.toUpperCase()}`;
  console.log(summary);
  if (statusObj.status === 'blocked') {
    console.log('Blocked reasons:', statusObj.blockedReasons.map(r => r.code).join(', '));
  }

  // GitHub Step Summary
  if (process.env.GITHUB_STEP_SUMMARY) {
    try {
      const summaryMd = `### Release Status: ${statusObj.status.toUpperCase()}\n` +
        `**Ancestry source:** ${statusObj.backportContext ? (statusObj.backportContext.mode === 'series-branch' ? `series (${statusObj.backportContext.seriesBranch})` : 'default (main)') : 'unknown'}\n` +
        (statusObj.blockedReasons.length > 0 ?
          `**Blocked Reasons:**\n${statusObj.blockedReasons.map(r => `- \`${r.code}\`: ${r.message}`).join('\n')}\n` :
          'All checks passed. Release is ready.\n');

      appendFileSync(process.env.GITHUB_STEP_SUMMARY, summaryMd);
    } catch (e) {
      console.error("Failed to write to GITHUB_STEP_SUMMARY", e);
    }
  }
}

main();

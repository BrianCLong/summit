#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';

const BACKLOG_PATH = path.resolve(process.cwd(), 'backlog.yaml');
const LIMITS_PATH = path.resolve(process.cwd(), 'docs/releases/STABILIZATION_LIMITS.yml');
const REPORT_DIR = path.resolve(process.cwd(), 'artifacts/stabilization/sustainability');
const REPORT_MD_PATH = path.join(REPORT_DIR, 'report.md');
const REPORT_JSON_PATH = path.join(REPORT_DIR, 'report.json');

// Ensure output directory exists
if (!fs.existsSync(REPORT_DIR)) {
  fs.mkdirSync(REPORT_DIR, { recursive: true });
}

function loadYaml(filepath) {
  if (!fs.existsSync(filepath)) {
    throw new Error(`File not found: ${filepath}`);
  }
  return yaml.load(fs.readFileSync(filepath, 'utf8'));
}

function parsePriority(priorityStr) {
    if (!priorityStr) return null;
    if (priorityStr.startsWith('P0')) return 'P0';
    if (priorityStr.startsWith('P1')) return 'P1';
    return null; // Ignore P2, P3 etc for this check
}

function validateItemFields(item, priority) {
    const missing = [];
    // Requirement: owner, ticket, target date, acceptance criteria
    // Mapping from backlog.yaml fields (which might need to be enhanced)

    // In current backlog.yaml, items look like:
    // { story: "...", priority: "...", sprint: "..." }
    // There are no owner, ticket, target_date, acceptance_criteria fields yet.
    // So for now, we check if they exist in the object.

    if (!item.owner) missing.push('owner');
    if (!item.ticket) missing.push('ticket');
    if (!item.target_date) missing.push('target_date');
    if (!item.acceptance_criteria) missing.push('acceptance_criteria');

    return missing;
}

function checkDateOverdue(dateStr) {
    if (!dateStr) return false;
    const date = new Date(dateStr);
    const today = new Date();
    // Reset time for simple date comparison
    today.setHours(0,0,0,0);
    return date < today;
}

function isWaived(storyName, waivers) {
    if (!waivers || !Array.isArray(waivers)) return false;

    // Check if any active waiver covers this story
    // Assuming waiver has 'story' (or 'item') and 'expires_at'
    const today = new Date();
    today.setHours(0,0,0,0);

    return waivers.some(waiver => {
        if (waiver.item !== storyName && waiver.story !== storyName) return false;

        if (waiver.expires) {
            const expiry = new Date(waiver.expires);
            if (expiry < today) return false; // Expired
        }
        return true;
    });
}

function main() {
    console.log("Starting Stabilization Limits Validation...");

    let backlog;
    let limits;

    try {
        backlog = loadYaml(BACKLOG_PATH);
        limits = loadYaml(LIMITS_PATH);
    } catch (e) {
        console.error(`Error loading configuration: ${e.message}`);
        process.exit(1);
    }

    const waivers = limits.waivers && limits.waivers.list ? limits.waivers.list : [];

    const stats = {
        active_p0: 0,
        active_p1: 0,
        overdue_total: 0,
        blocked_unissued_p0: 0,
        blocked_unissued_p1: 0,
        items_analyzed: 0,
        waived_count: 0
    };

    const details = {
        p0_items: [],
        p1_items: [],
        overdue_items: [],
        unissued_items: [],
        waived_items: []
    };

    // Flatten backlog structure
    // backlog.yaml has { backlog: [ { epic: ..., stories: [ ... ] } ] }
    if (backlog && backlog.backlog && Array.isArray(backlog.backlog)) {
        backlog.backlog.forEach(epicGroup => {
            if (epicGroup.stories && Array.isArray(epicGroup.stories)) {
                epicGroup.stories.forEach(story => {
                    stats.items_analyzed++;
                    const priority = parsePriority(story.priority);
                    const isDone = story.status === 'DONE' || story.status === 'Done'; // Assuming status field exists or will exist

                    if (!priority) return; // Not P0 or P1
                    if (isDone) return;

                    const waived = isWaived(story.story, waivers);
                    if (waived) {
                        stats.waived_count++;
                        details.waived_items.push(story.story);
                        return; // Skip counting towards limits if waived
                    }

                    if (priority === 'P0') {
                        stats.active_p0++;
                        details.p0_items.push(story);
                    } else if (priority === 'P1') {
                        stats.active_p1++;
                        details.p1_items.push(story);
                    }

                    // Check overdue
                    if (checkDateOverdue(story.target_date)) {
                        stats.overdue_total++;
                        details.overdue_items.push(story);
                    }

                    // Check blocked/unissued (missing required fields)
                    const missingFields = validateItemFields(story, priority);
                    if (missingFields.length > 0) {
                        if (priority === 'P0') stats.blocked_unissued_p0++;
                        if (priority === 'P1') stats.blocked_unissued_p1++;
                        details.unissued_items.push({ story: story.story, priority, missing: missingFields });
                    }
                });
            }
        });
    }

    // Validation Logic
    const report = {
        timestamp: new Date().toISOString(),
        limits: limits.limits,
        stats: stats,
        pass: true,
        failures: [],
        waivers_active: details.waived_items
    };

    if (stats.active_p0 > limits.limits.active.P0_max) {
        report.pass = false;
        report.failures.push(`Active P0 items (${stats.active_p0}) exceed limit (${limits.limits.active.P0_max})`);
    }

    if (stats.active_p1 > limits.limits.active.P1_max) {
        report.pass = false;
        report.failures.push(`Active P1 items (${stats.active_p1}) exceed limit (${limits.limits.active.P1_max})`);
    }

    if (stats.overdue_total > limits.limits.active.overdue_max) {
        report.pass = false;
        report.failures.push(`Total overdue items (${stats.overdue_total}) exceed limit (${limits.limits.active.overdue_max})`);
    }

    if (stats.blocked_unissued_p0 > limits.limits.blocked_unissued.P0_max) {
        report.pass = false;
        report.failures.push(`Blocked/Unissued P0 items (${stats.blocked_unissued_p0}) exceed limit (${limits.limits.blocked_unissued.P0_max})`);
    }

    if (stats.blocked_unissued_p1 > limits.limits.blocked_unissued.P1_max) {
        report.pass = false;
        report.failures.push(`Blocked/Unissued P1 items (${stats.blocked_unissued_p1}) exceed limit (${limits.limits.blocked_unissued.P1_max})`);
    }

    // Generate Markdown Report
    let mdContent = `# Stabilization Sustainability Report
**Date:** ${report.timestamp}
**Status:** ${report.pass ? '✅ PASS' : '❌ FAIL'}

## Executive Summary
| Metric | Current | Limit | Status |
| :--- | :--- | :--- | :--- |
| Active P0 | ${stats.active_p0} | ${limits.limits.active.P0_max} | ${stats.active_p0 <= limits.limits.active.P0_max ? '✅' : '❌'} |
| Active P1 | ${stats.active_p1} | ${limits.limits.active.P1_max} | ${stats.active_p1 <= limits.limits.active.P1_max ? '✅' : '❌'} |
| Overdue Total | ${stats.overdue_total} | ${limits.limits.active.overdue_max} | ${stats.overdue_total <= limits.limits.active.overdue_max ? '✅' : '❌'} |
| Unissued P0 | ${stats.blocked_unissued_p0} | ${limits.limits.blocked_unissued.P0_max} | ${stats.blocked_unissued_p0 <= limits.limits.blocked_unissued.P0_max ? '✅' : '❌'} |
| Unissued P1 | ${stats.blocked_unissued_p1} | ${limits.limits.blocked_unissued.P1_max} | ${stats.blocked_unissued_p1 <= limits.limits.blocked_unissued.P1_max ? '✅' : '❌'} |

## Failures
${report.failures.length > 0 ? report.failures.map(f => `- 🔴 ${f}`).join('\n') : 'No failures detected.'}

## Unissued Items (Missing Fields)
${details.unissued_items.length > 0 ?
    '**Requirement:** Owner, Ticket, Target Date, Acceptance Criteria must be present for P0/P1 items.\n\n' +
    details.unissued_items.map(i => `- [${i.priority}] **${i.story}**: Missing ${i.missing.join(', ')}`).join('\n')
    : 'All P0/P1 items are fully issued.'}

## Waivers
${details.waived_items.length > 0 ? details.waived_items.map(i => `- ${i}`).join('\n') : 'No active waivers.'}
`;

    // Write Outputs
    fs.writeFileSync(REPORT_JSON_PATH, JSON.stringify(report, null, 2));
    fs.writeFileSync(REPORT_MD_PATH, mdContent);

    console.log(`Report generated at: ${REPORT_MD_PATH}`);
    console.log(`JSON Report generated at: ${REPORT_JSON_PATH}`);

    const args = process.argv.slice(2);
    const mode = args.includes('--mode=enforce') ? 'enforce' : 'warn';

    if (mode === 'enforce' && !report.pass) {
        console.error('Validation failed in enforce mode.');
        process.exit(1);
    } else if (!report.pass) {
        console.warn('Validation failed (warn-only).');
    } else {
        console.log('Validation passed.');
    }
}

main();

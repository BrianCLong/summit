#!/usr/bin/env node

const fs = require('fs');

const outputPath = process.argv[2] || '/tmp/graduation-input.json';
const eventPath = process.env.GITHUB_EVENT_PATH;

if (!eventPath) {
  console.error('GITHUB_EVENT_PATH is required.');
  process.exit(1);
}

const event = JSON.parse(fs.readFileSync(eventPath, 'utf8'));
const pr = event.pull_request || {};
const body = pr.body || '';

const extractLineValue = (label) => {
  const pattern = new RegExp(`${label}\\s*:\\s*([^\\n]+)`, 'i');
  const match = body.match(pattern);
  return match ? match[1].trim() : '';
};

const normalizeState = (raw) => {
  if (!raw) {
    return '';
  }
  const match = raw.match(/(Experimental|GA-Adjacent|GA)/i);
  if (!match) {
    return '';
  }
  return match[1]
    .replace(/experimental/i, 'Experimental')
    .replace(/ga-adjacent/i, 'GA-Adjacent')
    .replace(/^ga$/i, 'GA');
};

const normalizeIntent = (raw) => {
  if (!raw) {
    return '';
  }
  const normalized = raw.replace(/\s*->\s*/g, ' → ');
  const match = normalized.match(
    /(Experimental\s*→\s*GA-Adjacent|GA-Adjacent\s*→\s*GA|None)/i,
  );
  if (!match) {
    return '';
  }
  return match[1]
    .replace(/experimental\s*→\s*ga-adjacent/i, 'Experimental → GA-Adjacent')
    .replace(/ga-adjacent\s*→\s*ga/i, 'GA-Adjacent → GA')
    .replace(/^none$/i, 'None');
};

const normalizeEvidence = (raw) => {
  if (!raw) {
    return '';
  }
  const trimmed = raw.trim();
  if (/^(n\/a|na|tbd)$/i.test(trimmed)) {
    return '';
  }
  return trimmed;
};

const normalizeApproval = (raw) => {
  if (!raw) {
    return '';
  }
  const match = raw.match(/(Approved|Pending)/i);
  if (!match) {
    return '';
  }
  return match[1]
    .replace(/approved/i, 'Approved')
    .replace(/pending/i, 'Pending');
};

const frontendState = normalizeState(extractLineValue('Frontend lifecycle'));
const backendState = normalizeState(extractLineValue('Backend lifecycle'));
const promotionIntent = normalizeIntent(extractLineValue('Promotion intent'));
const evidence = normalizeEvidence(extractLineValue('Evidence bundle'));
const jointApproval = normalizeApproval(extractLineValue('Joint approval'));

const output = {
  pr: {
    number: pr.number,
    title: pr.title || '',
  },
  graduation: {
    frontend_state: frontendState,
    backend_state: backendState,
    promotion_intent: promotionIntent,
    evidence,
    joint_approval: jointApproval,
  },
};

fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));
console.log(`Graduation metadata written to ${outputPath}`);

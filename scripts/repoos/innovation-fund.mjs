#!/usr/bin/env node

import fs from 'fs/promises';
import path from 'path';

const ROOT = process.cwd();
const FUND_DIR = path.join(ROOT, '.repoos', 'fund');
const EVIDENCE_DIR = path.join(ROOT, '.repoos', 'evidence');

const PROPOSALS_FILE = path.join(FUND_DIR, 'proposals.json');
const CATEGORIES_FILE = path.join(FUND_DIR, 'grant-categories.json');
const REGISTRY_FILE = path.join(FUND_DIR, 'innovation-fund-registry.json');
const EVALUATION_FILE = path.join(FUND_DIR, 'evaluation-results.json');
const REPORT_FILE = path.join(EVIDENCE_DIR, 'innovation-fund-report.json');

function usage() {
  console.log(`Innovation Fund CLI

Usage:
  node scripts/repoos/innovation-fund.mjs fund list-proposals
  node scripts/repoos/innovation-fund.mjs fund submit-proposal --proposal-id IF-004 --project-name "Name" --developer "Org" --description "Desc" --requested-funding 100000 --impact 85 --initiative-type ecosystem-plugins --adoption 80 --alignment 90
  node scripts/repoos/innovation-fund.mjs fund approve <proposal_id>
  node scripts/repoos/innovation-fund.mjs fund evaluate
  node scripts/repoos/innovation-fund.mjs fund validate-proposals
  node scripts/repoos/innovation-fund.mjs fund build-report`);
}

function parseFlags(args) {
  const flags = {};
  for (let i = 0; i < args.length; i += 1) {
    const token = args[i];
    if (!token.startsWith('--')) continue;
    const key = token.slice(2);
    const value = args[i + 1];
    flags[key] = value;
    i += 1;
  }
  return flags;
}

async function ensureDirs() {
  await fs.mkdir(FUND_DIR, { recursive: true });
  await fs.mkdir(EVIDENCE_DIR, { recursive: true });
}

async function readJson(filePath, fallback) {
  try {
    return JSON.parse(await fs.readFile(filePath, 'utf-8'));
  } catch {
    return fallback;
  }
}

async function writeJson(filePath, data) {
  await fs.writeFile(filePath, `${JSON.stringify(data, null, 2)}\n`);
}

function validateProposal(proposal, categories) {
  const required = [
    'proposal_id',
    'project_description',
    'requested_funding',
    'ecosystem_impact'
  ];

  for (const field of required) {
    if (proposal[field] === undefined || proposal[field] === null || proposal[field] === '') {
      return `Missing required field: ${field}`;
    }
  }

  if (!Number.isFinite(Number(proposal.requested_funding)) || Number(proposal.requested_funding) <= 0) {
    return 'requested_funding must be a positive number';
  }

  if (!Number.isFinite(Number(proposal.ecosystem_impact)) || Number(proposal.ecosystem_impact) < 0 || Number(proposal.ecosystem_impact) > 100) {
    return 'ecosystem_impact must be a number between 0 and 100';
  }

  if (proposal.initiative_type && !categories.includes(proposal.initiative_type)) {
    return `initiative_type must be one of: ${categories.join(', ')}`;
  }

  return null;
}

function evaluateProposal(proposal) {
  const ecosystemImpact = Number(proposal.ecosystem_impact || 0);
  const adoptionPotential = Number(proposal.expected_adoption_potential || 50);
  const strategicAlignment = Number(proposal.strategic_alignment || 50);

  const weightedScore =
    ecosystemImpact * 0.45 +
    adoptionPotential * 0.30 +
    strategicAlignment * 0.25;

  const recommendation =
    weightedScore >= 85 ? 'approve' :
    weightedScore >= 70 ? 'review' : 'decline';

  return {
    proposal_id: proposal.proposal_id,
    project_name: proposal.project_name,
    developer_or_partner: proposal.developer_or_partner,
    initiative_type: proposal.initiative_type,
    ecosystem_impact: ecosystemImpact,
    developer_adoption_potential: adoptionPotential,
    strategic_alignment: strategicAlignment,
    weighted_score: Number(weightedScore.toFixed(2)),
    recommendation
  };
}

async function listProposals() {
  const proposals = await readJson(PROPOSALS_FILE, { proposals: [] });
  const rows = [...proposals.proposals].sort((a, b) => a.proposal_id.localeCompare(b.proposal_id));
  if (rows.length === 0) {
    console.log('No proposals found.');
    return;
  }

  for (const p of rows) {
    console.log(`${p.proposal_id} | ${p.project_name} | $${p.requested_funding} | impact=${p.ecosystem_impact} | status=${p.status || 'submitted'}`);
  }
}

async function submitProposal(flags) {
  const proposals = await readJson(PROPOSALS_FILE, { proposals: [] });
  const categories = await readJson(CATEGORIES_FILE, { grant_categories: [] });
  const categoryIds = categories.grant_categories.map((c) => c.id);

  const proposal = {
    proposal_id: flags['proposal-id'],
    project_name: flags['project-name'],
    developer_or_partner: flags.developer,
    project_description: flags.description,
    requested_funding: Number(flags['requested-funding']),
    ecosystem_impact: Number(flags.impact),
    initiative_type: flags['initiative-type'],
    expected_adoption_potential: Number(flags.adoption || 50),
    strategic_alignment: Number(flags.alignment || 50),
    status: 'submitted'
  };

  const err = validateProposal(proposal, categoryIds);
  if (err) {
    throw new Error(`Proposal validation failed: ${err}`);
  }

  if (proposals.proposals.some((p) => p.proposal_id === proposal.proposal_id)) {
    throw new Error(`Proposal ${proposal.proposal_id} already exists`);
  }

  proposals.proposals.push(proposal);
  proposals.proposals.sort((a, b) => a.proposal_id.localeCompare(b.proposal_id));
  await writeJson(PROPOSALS_FILE, proposals);

  console.log(`Submitted proposal ${proposal.proposal_id}`);
}

async function validateProposals() {
  const proposals = await readJson(PROPOSALS_FILE, { proposals: [] });
  const categories = await readJson(CATEGORIES_FILE, { grant_categories: [] });
  const categoryIds = categories.grant_categories.map((c) => c.id);

  const errors = [];
  for (const proposal of proposals.proposals) {
    const err = validateProposal(proposal, categoryIds);
    if (err) {
      errors.push({ proposal_id: proposal.proposal_id, error: err });
    }
  }

  if (errors.length > 0) {
    console.error('Proposal schema validation failed:\n', JSON.stringify(errors, null, 2));
    process.exit(1);
  }

  console.log(`Validated ${proposals.proposals.length} proposals successfully.`);
}

async function evaluateAll() {
  const proposals = await readJson(PROPOSALS_FILE, { proposals: [] });
  const evaluated = proposals.proposals
    .map((proposal) => evaluateProposal(proposal))
    .sort((a, b) => b.weighted_score - a.weighted_score || a.proposal_id.localeCompare(b.proposal_id));

  await writeJson(EVALUATION_FILE, {
    criteria: ['ecosystem impact', 'developer adoption potential', 'strategic alignment'],
    results: evaluated
  });

  console.log(`Evaluated ${evaluated.length} proposals.`);
}

async function approveProposal(proposalId) {
  const proposals = await readJson(PROPOSALS_FILE, { proposals: [] });
  const registry = await readJson(REGISTRY_FILE, { funded_initiatives: [] });

  const proposal = proposals.proposals.find((p) => p.proposal_id === proposalId);
  if (!proposal) {
    throw new Error(`Proposal ${proposalId} not found`);
  }

  proposal.status = 'approved';

  const exists = registry.funded_initiatives.find((f) => f.project_name === proposal.project_name);
  if (!exists) {
    registry.funded_initiatives.push({
      project_name: proposal.project_name,
      developer_or_partner: proposal.developer_or_partner,
      funding_amount: Number(proposal.requested_funding),
      initiative_type: proposal.initiative_type,
      expected_impact: proposal.project_description
    });
  }

  proposals.proposals.sort((a, b) => a.proposal_id.localeCompare(b.proposal_id));
  registry.funded_initiatives.sort((a, b) => a.project_name.localeCompare(b.project_name));

  await writeJson(PROPOSALS_FILE, proposals);
  await writeJson(REGISTRY_FILE, registry);

  console.log(`Approved proposal ${proposalId}`);
}

async function buildReport() {
  const proposals = await readJson(PROPOSALS_FILE, { proposals: [] });
  const evaluations = await readJson(EVALUATION_FILE, { results: [] });
  const registry = await readJson(REGISTRY_FILE, { funded_initiatives: [] });

  const approved = proposals.proposals.filter((p) => p.status === 'approved').length;
  const submitted = proposals.proposals.length;
  const totalCommitted = registry.funded_initiatives.reduce((sum, initiative) => sum + Number(initiative.funding_amount || 0), 0);

  const byType = registry.funded_initiatives.reduce((acc, initiative) => {
    const key = initiative.initiative_type || 'unknown';
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  const topProposal = [...evaluations.results]
    .sort((a, b) => b.weighted_score - a.weighted_score || a.proposal_id.localeCompare(b.proposal_id))[0] || null;

  const report = {
    fund_summary: {
      total_submitted_proposals: submitted,
      total_approved_proposals: approved,
      total_committed_funding: totalCommitted,
      funded_initiatives_by_type: Object.keys(byType)
        .sort()
        .reduce((acc, key) => {
          acc[key] = byType[key];
          return acc;
        }, {}),
      highest_ranked_proposal: topProposal
        ? {
            proposal_id: topProposal.proposal_id,
            project_name: topProposal.project_name,
            weighted_score: topProposal.weighted_score
          }
        : null
    }
  };

  await writeJson(REPORT_FILE, report);
  console.log('Generated deterministic evidence report:', REPORT_FILE);
}

async function main() {
  await ensureDirs();

  const args = process.argv.slice(2);
  const commandArgs = args[0] === 'fund' ? args.slice(1) : args;
  const [command, ...rest] = commandArgs;

  if (!command) {
    usage();
    process.exit(1);
  }

  if (command === 'list-proposals') return listProposals();
  if (command === 'submit-proposal') return submitProposal(parseFlags(rest));
  if (command === 'approve') return approveProposal(rest[0]);
  if (command === 'evaluate') return evaluateAll();
  if (command === 'validate-proposals') return validateProposals();
  if (command === 'build-report') return buildReport();

  usage();
  process.exit(1);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});

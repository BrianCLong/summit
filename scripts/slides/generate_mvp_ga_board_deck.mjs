import PptxGenJS from 'pptxgenjs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PRES_TITLE = "Summit MVP-4 GA Board Deck";
const OUTPUT_PATH = path.join(__dirname, '../../docs/ga/MVP-GA_BOARD_DECK.pptx');
const DATE_STR = new Date().toISOString().split('T')[0];

// Get Git SHA
let COMMIT_SHA = 'UNKNOWN';
try {
  COMMIT_SHA = execSync('git rev-parse --short HEAD').toString().trim();
} catch (e) {
  console.warn("Could not retrieve git SHA", e);
}

// Initialize Presentation
let pres = new PptxGenJS();
pres.layout = 'LAYOUT_16x9';
pres.title = PRES_TITLE;
pres.subject = "Executive Board Summary for Summit MVP-4 GA";
pres.author = "Jules (Board Deck Builder)";

// Styling Constants
const COLOR_PRIMARY = '003366'; // Dark Blue
const COLOR_ACCENT = '0099CC'; // Lighter Blue
const COLOR_TEXT = '333333';
const COLOR_WHITE = 'FFFFFF';
const COLOR_LIGHT_GRAY = 'F0F0F0';
const COLOR_GREEN = '009933';
const COLOR_RED = 'CC0000';

const MASTER_SLIDE_NAME = 'MASTER_SLIDE';

pres.defineSlideMaster({
  title: MASTER_SLIDE_NAME,
  background: { color: COLOR_WHITE },
  objects: [
    {
      rect: { x: 0, y: 0, w: '100%', h: 0.75, fill: { color: COLOR_PRIMARY } },
    },
    {
      rect: { x: 0, y: 8.25, w: '100%', h: 0.75, fill: { color: COLOR_LIGHT_GRAY } },
    },
    {
      text: {
        text: 'Summit MVP-4 GA',
        options: { x: 0.5, y: 8.4, w: 4, h: 0.5, fontSize: 12, color: COLOR_TEXT },
      },
    },
    {
      text: {
        text: `${DATE_STR} | SHA: ${COMMIT_SHA} | CONFIDENTIAL`,
        options: { x: 8.5, y: 8.4, w: 7, h: 0.5, fontSize: 12, color: COLOR_TEXT, align: 'right' },
      },
    },
  ],
});

// Helper to add a standard slide
function addSlide(title) {
  let slide = pres.addSlide({ masterName: MASTER_SLIDE_NAME });
  slide.addText(title, { x: 0.5, y: 0.1, w: '90%', h: 0.6, fontSize: 24, color: COLOR_WHITE, bold: true });
  return slide;
}

// --------------------------------------------------------------------------
// Slide 1: Title / Status
// --------------------------------------------------------------------------
let slide1 = pres.addSlide();
slide1.background = { color: COLOR_PRIMARY };
slide1.addText("Summit MVP-4 GA", { x: 0, y: 2.5, w: '100%', fontSize: 44, color: COLOR_WHITE, align: 'center', bold: true });
slide1.addText(`Release: v4.0.4 "Ironclad Standard"`, { x: 0, y: 3.5, w: '100%', fontSize: 24, color: COLOR_ACCENT, align: 'center' });
slide1.addText("STATUS: GO", { x: 0, y: 5.0, w: '100%', fontSize: 60, color: COLOR_GREEN, align: 'center', bold: true });
slide1.addText(`${DATE_STR} | Commit: ${COMMIT_SHA}`, { x: 0, y: 6.5, w: '100%', fontSize: 18, color: COLOR_WHITE, align: 'center' });

slide1.addNotes(`[Evidence]
* Claim: GA Status is GO
  * Proof: docs/ga/exec-go-no-go-and-day0-runbook.md (Section: "Go/No-Go Rationale")
* Claim: Release Version v4.0.4
  * Proof: docs/releases/MVP-4_RELEASE_NOTES_FINAL.md
* Claim: Commit SHA
  * Value: ${COMMIT_SHA}
`);

// --------------------------------------------------------------------------
// Slide 2: What We’re Shipping
// --------------------------------------------------------------------------
let slide2 = addSlide("What We’re Shipping");
slide2.addText(
  [
    { text: "Governance & Compliance", options: { fontSize: 20, bold: true, breakLine: true } },
    { text: "Automated SBOM & Provenance generation for every build.", options: { fontSize: 16, bullet: true } },
    { text: "Release Bundle verification scripts ensuring artifact integrity.", options: { fontSize: 16, bullet: true, breakLine: true } },

    { text: "Operational Rigor", options: { fontSize: 20, bold: true, breakLine: true } },
    { text: "Standardized 'make ga' and 'make smoke' targets for consistent verification.", options: { fontSize: 16, bullet: true } },
    { text: "Formalized Rollback Protocol and documented Disaster Recovery drills.", options: { fontSize: 16, bullet: true, breakLine: true } },

    { text: "Security Hardening", options: { fontSize: 20, bold: true, breakLine: true } },
    { text: "Ingestion pipeline hardening and policy preflight checks.", options: { fontSize: 16, bullet: true } },
    { text: "Centralized evidence indexing for audit readiness.", options: { fontSize: 16, bullet: true } },
  ],
  { x: 0.5, y: 1.0, w: 12, h: 6.5, valign: 'top' }
);

slide2.addNotes(`[Evidence]
* Claim: SBOM & Provenance
  * Proof: docs/releases/MVP-4_RELEASE_NOTES_FINAL.md ("Security and Governance" section)
  * Repro: npm run generate:sbom
* Claim: Release Bundle Verification
  * Proof: scripts/release/verify-release-bundle.mjs
* Claim: Operational Targets (make ga, make smoke)
  * Proof: Makefile targets 'ga', 'smoke'
* Claim: Security Hardening
  * Proof: docs/ga/MVP4_GA_EVIDENCE_MAP.md ("Ingestion security hardening")
`);

// --------------------------------------------------------------------------
// Slide 3: Differentiators
// --------------------------------------------------------------------------
let slide3 = addSlide("Differentiators");
slide3.addText(
  [
    { text: "Verifiable Integrity", options: { fontSize: 20, bold: true, breakLine: true } },
    { text: "Not just claimed, but cryptographically proven supply chain security.", options: { fontSize: 18, bullet: true } },
    { text: "Evidence-backed release gates ensure no unchecked code enters production.", options: { fontSize: 18, bullet: true, breakLine: true } },

    { text: "Deterministic Operations", options: { fontSize: 20, bold: true, breakLine: true } },
    { text: "'Ironclad' release process removes human error from the critical path.", options: { fontSize: 18, bullet: true } },
    { text: "Drift detection is active and continuous.", options: { fontSize: 18, bullet: true, breakLine: true } },
  ],
  { x: 0.5, y: 1.0, w: 12, h: 6.5, valign: 'top' }
);

slide3.addNotes(`[Evidence]
* Claim: Cryptographically proven supply chain
  * Proof: docs/releases/MVP-4_RELEASE_NOTES_FINAL.md (Provenance generation)
* Claim: Evidence-backed release gates
  * Proof: docs/ga/MVP4_GA_EVIDENCE_MAP.md
* Claim: Deterministic Operations
  * Proof: scripts/ga/verify-ga-surface.mjs (Automated verification script)
`);

// --------------------------------------------------------------------------
// Slide 4: Verification Snapshot
// --------------------------------------------------------------------------
let slide4 = addSlide("Verification Snapshot");

const rows = [
  ['Check', 'Result', 'Evidence Pointer'],
  ['GA Verify Gate', 'PASSED', 'docs/ga/MVP4_GA_EVIDENCE_MAP.md'],
  ['Security Audit', 'PASSED', 'docs/releases/MVP-4_POST_GA_STABILIZATION_PLAN.md'],
  ['Unit Tests', 'PASSED', 'CI Logs / docs/release/GA_READINESS_REPORT.md'],
  ['Secret Scan', 'PASSED', 'docs/release/GA_EVIDENCE_INDEX.md'],
  ['Quickstart Smoke', 'PASSED', 'docs/ga/exec-go-no-go-and-day0-runbook.md'],
];

slide4.addTable(rows, {
  x: 1.0,
  y: 1.5,
  w: 11.0,
  fill: { color: COLOR_WHITE },
  border: { pt: 1, color: COLOR_LIGHT_GRAY },
  color: COLOR_TEXT,
  fontSize: 14,
  rowH: 0.7,
  colW: [3, 2, 6],
  autoPage: false,
});

slide4.addNotes(`[Evidence]
* Claim: Verification Snapshot Data
  * Proof: docs/ga/MVP4_GA_EVIDENCE_MAP.md
  * Proof: docs/releases/MVP-4_POST_GA_STABILIZATION_PLAN.md
  * Proof: docs/ga/exec-go-no-go-and-day0-runbook.md
`);

// --------------------------------------------------------------------------
// Slide 5: Key Risks (Top 3)
// --------------------------------------------------------------------------
let slide5 = addSlide("Key Risks & Mitigation");

const riskRows = [
  ['Risk', 'Impact', 'Mitigation', 'Residual'],
  ['Isolation Drift', 'Data leak between tenants', 'Continuous drift checks & policy enforcement', 'Medium'],
  ['Offline Sync', 'Data corruption on resync', 'Offline resilience tests & operational drills', 'Low'],
  ['Supply Chain', 'Compromised dependencies', 'Strict pinning & SBOM verification', 'Low'],
];

slide5.addTable(riskRows, {
  x: 0.5,
  y: 1.5,
  w: 12.0,
  fill: { color: COLOR_WHITE },
  border: { pt: 1, color: COLOR_LIGHT_GRAY },
  color: COLOR_TEXT,
  fontSize: 14,
  rowH: 0.8,
  colW: [2.5, 3.0, 4.5, 2.0],
});

slide5.addNotes(`[Evidence]
* Claim: Residual Risks
  * Proof: docs/ga/exec-go-no-go-and-day0-runbook.md (Section: "Residual Risks")
  * Proof: docs/releases/MVP-4_POST_GA_STABILIZATION_PLAN.md (Section: "Risk Ledger")
`);

// --------------------------------------------------------------------------
// Slide 6: Next 14 Days Plan
// --------------------------------------------------------------------------
let slide6 = addSlide("Next 14 Days Plan (Stabilization)");

slide6.addText(
  [
    { text: "Day 0-3: Hypercare", options: { fontSize: 18, bold: true, breakLine: true } },
    { text: "Hourly SLO checks & full CI/Security baseline capture.", options: { fontSize: 16, bullet: true } },
    { text: "Governance verification: verify:governance, verify:living-documents.", options: { fontSize: 16, bullet: true, breakLine: true } },

    { text: "Day 4-7: Week 1 Commitments", options: { fontSize: 18, bold: true, breakLine: true } },
    { text: "Enable `pnpm audit` in CI (Critical level).", options: { fontSize: 16, bullet: true } },
    { text: "Implement Prometheus error budgets.", options: { fontSize: 16, bullet: true, breakLine: true } },

    { text: "Day 8-14: Week 2 Stabilization", options: { fontSize: 18, bold: true, breakLine: true } },
    { text: "Eradicate quarantined tests (100% pass rate).", options: { fontSize: 16, bullet: true } },
    { text: "API determinism audit & type safety improvements.", options: { fontSize: 16, bullet: true } },
  ],
  { x: 0.5, y: 1.0, w: 12, h: 6.5, valign: 'top' }
);

slide6.addNotes(`[Evidence]
* Claim: Stabilization Plan
  * Proof: docs/releases/MVP-4_POST_GA_STABILIZATION_PLAN.md
`);

// --------------------------------------------------------------------------
// Slide 7: Merge Train Reality
// --------------------------------------------------------------------------
let slide7 = addSlide("Merge Train Reality");

slide7.addText(
  [
    { text: "Status: GREEN", options: { fontSize: 24, bold: true, color: COLOR_GREEN, breakLine: true } },
    { text: "Open PRs: 0", options: { fontSize: 18, bullet: true } },
    { text: "P0/P1 Blockers: 0", options: { fontSize: 18, bullet: true } },
    { text: "Queue Depth: 0", options: { fontSize: 18, bullet: true } },
    { text: "CI Status: PASSING", options: { fontSize: 18, bullet: true } },
  ],
  { x: 0.5, y: 1.5, w: 10, h: 5 }
);

slide7.addNotes(`[Evidence]
* Claim: Merge Train Dashboard Stats
  * Proof: docs/ga/MERGE_TRAIN_DASHBOARD.md
  * Timestamp: ${DATE_STR}
`);

// --------------------------------------------------------------------------
// Generate File
// --------------------------------------------------------------------------
pres.writeFile({ fileName: OUTPUT_PATH })
  .then((fileName) => {
    console.log(`Presentation generated successfully: ${fileName}`);
  })
  .catch((err) => {
    console.error("Error generating presentation:", err);
    process.exit(1);
  });

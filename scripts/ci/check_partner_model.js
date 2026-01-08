import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function loadJson(relPath) {
  const filePath = path.join(root, relPath);
  const raw = fs.readFileSync(filePath, "utf8");
  return JSON.parse(raw);
}

function fail(message) {
  console.error(`\u274c partner-check: ${message}`);
  process.exitCode = 1;
}

const approvedPatterns = loadJson("partners/approved_patterns.json");
const approvedPatternIds = new Set(approvedPatterns.patterns.map((p) => p.id));

const archetypes = loadJson("partners/partner_model.json").archetypes;
const certification = loadJson("partners/certification.json");
const claims = loadJson("partners/claims_registry.json");
const lifecycle = loadJson("partners/lifecycle.json");

function validateArchetypes() {
  const seen = new Set();
  archetypes.forEach((archetype) => {
    if (seen.has(archetype.id)) {
      fail(`duplicate archetype id detected: ${archetype.id}`);
    }
    seen.add(archetype.id);

    if (!archetype.owner) {
      fail(`archetype ${archetype.id} is missing an owner`);
    }

    if (!Array.isArray(archetype.non_goals) || archetype.non_goals.length === 0) {
      fail(`archetype ${archetype.id} must declare non-goals`);
    }

    if (!Array.isArray(archetype.supported_patterns) || archetype.supported_patterns.length === 0) {
      fail(`archetype ${archetype.id} has no supported patterns`);
    }

    archetype.supported_patterns.forEach((patternId) => {
      if (!approvedPatternIds.has(patternId)) {
        fail(`archetype ${archetype.id} references unsupported pattern ${patternId}`);
      }
      const guardrail = archetype.guardrails?.[patternId];
      if (!guardrail) {
        fail(`archetype ${archetype.id} missing guardrail block for ${patternId}`);
      }
      if (!guardrail.budget || !guardrail.residency || !Array.isArray(guardrail.enforcement)) {
        fail(`archetype ${archetype.id} has incomplete guardrail for ${patternId}`);
      }
    });

    const evidence = archetype.evidence;
    if (
      !evidence?.certification_target ||
      !Array.isArray(evidence.tests) ||
      evidence.tests.length === 0 ||
      !evidence.audit
    ) {
      fail(`archetype ${archetype.id} missing evidence plan`);
    }
  });
}

function validatePatternsAgainstClaims() {
  claims.claims.forEach((claim) => {
    if (!approvedPatternIds.has(claim.pattern)) {
      fail(`claim ${claim.id} references unapproved pattern ${claim.pattern}`);
    }
    if (!Array.isArray(claim.allowed_for) || claim.allowed_for.length === 0) {
      fail(`claim ${claim.id} must target at least one archetype`);
    }
    if (!Array.isArray(claim.disclaimers) || claim.disclaimers.length === 0) {
      fail(`claim ${claim.id} missing disclaimers`);
    }
    if (!claim.evidence) {
      fail(`claim ${claim.id} missing evidence link`);
    }
    if (!Array.isArray(claim.negative_tests) || claim.negative_tests.length === 0) {
      fail(`claim ${claim.id} must encode negative tests for scope creep`);
    }
    claim.allowed_for.forEach((archetypeId) => {
      const exists = archetypes.find((a) => a.id === archetypeId);
      if (!exists) {
        fail(`claim ${claim.id} targets missing archetype ${archetypeId}`);
      }
      if (!exists.supported_patterns.includes(claim.pattern)) {
        fail(
          `claim ${claim.id} maps to pattern ${claim.pattern} not supported by archetype ${archetypeId}`
        );
      }
    });
  });
}

function validateCertification() {
  const tiers = certification.tiers;
  const requiredFields = ["tests", "security_posture", "residency_validation"];
  tiers.forEach((tier) => {
    requiredFields.forEach((field) => {
      const entry = tier.requirements?.[field];
      if (!entry || (Array.isArray(entry) && entry.length === 0)) {
        fail(`certification tier ${tier.id} missing requirement ${field}`);
      }
    });
    if (!tier.revocation) {
      fail(`certification tier ${tier.id} missing revocation rule`);
    }
  });
}

function validateLifecycle() {
  const exitStage = lifecycle.stages.find((stage) => stage.id === "exit");
  if (!exitStage) {
    fail("lifecycle is missing exit stage");
    return;
  }
  const requiredControls = [
    "access removal",
    "data separation",
    "artifact cleanup",
    "audit trail export",
  ];
  requiredControls.forEach((control) => {
    if (!exitStage.controls.includes(control)) {
      fail(`exit stage missing control: ${control}`);
    }
  });
  if (
    !Array.isArray(lifecycle.revocation?.mechanics) ||
    lifecycle.revocation.mechanics.length === 0
  ) {
    fail("revocation mechanics are missing");
  }
  if (
    !Array.isArray(lifecycle.revocation?.validation) ||
    lifecycle.revocation.validation.length === 0
  ) {
    fail("revocation validation steps are missing");
  }
}

validateArchetypes();
validatePatternsAgainstClaims();
validateCertification();
validateLifecycle();

if (process.exitCode) {
  console.error("\u274c partner-check: failure detected");
  process.exit(process.exitCode);
} else {
  console.log("\u2705 partner-check: partner operating model is valid and enforceable");
}

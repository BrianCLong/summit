const fs = require("fs");
const path = require("path");

// Configuration
const STRATEGIC_BETS_FILE = "docs/strategy/STRATEGIC_BETS.md";
const REQUIRED_TAGS = [
  "[Bet:Agents]",
  "[Bet:Assurance]",
  "[Bet:Defense]",
  "[Bet:AutoScientist]",
  "[Bet:Infra]",
  "[Bet:Docs]",
  "[Bet:None]",
];
const PR_DESCRIPTION_FILE = process.env.PR_DESCRIPTION_FILE || "PR_SUMMARY.md"; // Fallback for testing

// 1. Verify Strategy File Exists
if (!fs.existsSync(STRATEGIC_BETS_FILE)) {
  console.error(`❌ CRITICAL: Strategy definition file missing at ${STRATEGIC_BETS_FILE}`);
  process.exit(1);
}
console.log(`✅ Strategy file found: ${STRATEGIC_BETS_FILE}`);

// 2. (Optional) In a real CI, we would check the PR description for alignment tags.
// For now, we will just output a reminder of the bets.
console.log("ℹ️  Verifying Strategic Alignment...");
console.log("   Active Bets:");
console.log("   1. Regulated Agentic Marketplace");
console.log("   2. Continuous Assurance (CAaaS)");
console.log("   3. Cognitive Defense Platform");
console.log("   4. Auto-Scientist SDK");

// 3. Scan codebase for "Strategy Tags" (This is a future capability, for now just a placeholder)
// We could look for @strategy(Bet:X) annotations in code.

console.log("\n✅ Governance Check Passed: Strategy Definition Exists.");
console.log("⚠️  REMINDER: Please ensure your PR description links to one of the above bets.");

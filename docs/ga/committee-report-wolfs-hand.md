---
title: Committee Report — Chairman Wolf
date: 2025-09-30
owner: GA Council Secretariat
audience: Exec, SRE, Security, Legal, Product, Governance, CI
---

# Case IG-GA-2025 • Council in Session by Wolf’s Hand • Distribution: Exec, SRE, Sec, Legal, Product, Governance, CI

> “Let shadows convene and voices of cunning speak… the Council is called, and by Wolf’s hand, in session.”

## Problem

IntelGraph must separate signal from noise at scale while avoiding counterintelligence panic—the Angleton “wilderness of mirrors.”
Ship product and governance controls that elevate evidence and provenance above speculation, formalize competing hypotheses, dampen paranoid feedback loops, and keep operators and institutions accountable.

## Summary of Deliberations

- **Sun Tzu:** Treat data as terrain; command the high ground of timing and perception.
  Favor prepared victories over improvisation; build tools that reveal tempo and terrain, not just correlations.
- **John le Carré:** Means shape ends; embed accountability in every analytic step and insist on caveated narratives, not certainties.
- **Niccolò Machiavelli:** Calibrate fear and favor—over‑suspicion corrodes the state.
  Require procedures that make skepticism useful rather than destructive.
- **Walsingham & Richelieu:** Prevention must be lawful and prudent; encode legal basis and policy at query time; preserve stability by design.
- **James Angleton** (invited to speak and constrained by guardrails): Build the mole‑hunt toolkit, but pair it with a paranoia dampener—Bayesian counterweights and hypothesis forks to prevent persecution spirals.
- **Traitors’ Bench (via Stauffenberg):** Trust without verification is worship; require alternate hypotheses and whistle‑safe integrity channels lest zeal or ego steer the hunt.

## Committee Position

Signal beats noise when provenance, explainability, and hypothesis discipline are first‑class citizens.
IntelGraph must ship with:

1. Provenance & Claim Ledger and contradiction graphs.
2. Explainable entity resolution with human adjudication.
3. A Hypothesis Workbench with Bayes updates.
4. Paranoia dampeners in counterintelligence analytics.
5. Governance rails (policy‑by‑default, audit, ombuds review).

These capabilities already appear in our backlog and should be elevated to must‑haves.

## Recommendations (Build & Operate)

1. **Provenance Before Prediction (enforce by design).**
   - Implement the Provenance & Claim Ledger: register evidence, hash transforms, create explicit claim nodes, and surface contradiction graphs in every investigative view.
     Acceptance includes exportable, verifiable manifests.
   - Mandate citations in outputs; block publication without linked evidence.
2. **Explainable Entity Resolution (reduce false links).**
   - Use deterministic + probabilistic ER with explainable scorecards, reversible merges, and human adjudication queues; show features and overrides in UI.
3. **Hypothesis Workbench + Dissent as a Feature.**
   - Require competing hypotheses, Bayes updates, missing‑evidence prompts, and an explicit dissent annex in reports; ship templates that surface costs of error.
4. **Angleton Tamed: Paranoia Dampeners in CI.**
   - Pair the mole‑hunt suite (long‑horizon anomaly sequences and deception indicators) with Bayesian counterweights and hypothesis forks; default UI warns on weak priors and overfitting.
5. **Source Tradecraft Panel & Fabrication Flags.**
   - Track credibility streaks, fabrication indicators, and moral‑ambiguity notes per source; display reliability trends inline to curb sensational single‑source claims.
6. **Telemetry Sanity & Data‑Poisoning Defenses.**
   - Monitor sensor health/drift, reject outliers, quarantine suspect feeds; target <2% false positives at triage on noisy inputs.
7. **Policy‑by‑Default & Legal Basis Binding.**
   - Enforce query‑time authority binding, RBAC/ABAC with OPA, and simulate policy changes before rollout; require “reason for access” logging.
8. **Integrity & Abuse Tripwires (institutional resilience).**
   - Stand up whistle‑safe channels, crypto evidence lockers, tamper alarms, dual‑control deletions, and abuse‑of‑power tripwires for overbroad queries—audited by an ombuds queue.
9. **Narrative Discipline in the UI.**
   - The report studio must generate caveated narratives with dissent, timeline/map/graph exhibits, and confidence bands, blocking publication without citations.
10. **Quiet Signals > Loud Alarms (operator safety).**
    - Deploy low‑and‑slow anomaly detectors (“too‑regular” patterns) to catch subtle insider or liaison risks without flooding analysts.
11. **Won’t‑Build & Defensive Alternatives.**
    - Reaffirm refusal to ship repression or coercive capabilities; focus on consent‑bound insider‑risk analytics with explicit false‑positive dampeners.

## Closing (Wolf)

Panic is the enemy of tradecraft.
We will make skepticism operational—anchored in provenance, explainability, Bayesian dampening, and governance—so that IntelGraph hunts moles without hunting its own soul.

---

### Annex: Relevant IntelGraph Capabilities Already Specced

- Provenance & Claim Ledger; contradiction graphs.
- Hypothesis Workbench; Narrative Briefs with dissent.
- Angleton’s mole‑hunt toolset + paranoia dampener.
- Explainable entity resolution; reversible merges.
- Telemetry sanity & poisoning defenses.
- Security, audit, policy simulation.

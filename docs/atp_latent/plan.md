# ATP-Latent Master Plan (1.0–1.29)

**Status**: In Progress
**Goal**: Integrate "Beyond Imitation: Reinforcement Learning for Active Latent Planning" (arXiv:2601.21598) into Summit.

## 1.0 ITEM intake
* **ITEM**: “Beyond Imitation: Reinforcement Learning for Active Latent Planning” (arXiv:2601.21598)
* **Authors**: Zhi Zheng, Wee Sun Lee
* **Claim**: Proposes **Active Latent Planning (ATP-Latent)**: (a) conditional VAE for latent-token supervision; (b) RL with auxiliary coherence reward based on decoded latent consistency. Reports **+4.1% accuracy** and **-3.3% tokens** on LLaMA-1B benchmarks.

## 1.5 Subsumption strategy
* Add a **Latent Reasoning Track** with:
  * `LatentCodec` (encode/decode latent tokens)
  * `LatentSupervisor` (conditional VAE loss)
  * `CoherenceReward` (decoded-consistency metric)
  * `RLTrainer` adapter that can optimize policy with auxiliary reward
* Add eval + evidence artifacts to compare accuracy, token usage, and coherence.

## 1.6 Two-lane plan
* **Lane 1 (Foundation, must-merge)**: schemas, harness scaffolding, adapters, deny-by-default tests, required-check discovery, governance.
* **Lane 2 (Innovation, flagged)**: actual ATP-Latent training loop + coherence reward tuning + latent planning rollouts.

## 1.9 Evidence system (always)
Define Evidence IDs (slug = `ATP-LATENT-2601-21598`):
* `EVD-ATP-LATENT-2601-21598-SCHEMA-001` (schemas exist + validated)
* `EVD-ATP-LATENT-2601-21598-EVAL-ACC-001` (accuracy metrics)
* `EVD-ATP-LATENT-2601-21598-EVAL-TOK-001` (token metrics)
* `EVD-ATP-LATENT-2601-21598-SAFE-RH-001` (reward-hacking negative tests)
* `EVD-ATP-LATENT-2601-21598-GOV-LOG-001` (redaction/no-leak checks)

## 1.15 Rollback plan
* Kill-switch flags; removing modules safe.
* CI gates ensure default path unchanged.

## Current Progress
- **PR1**: Evidence schemas & CI verifier added. `required_checks.todo.md` updated.
- **PR2**: Latent interfaces (`LatentCodec`, `LatentSupervisor`) added.
- **PR3**: Coherence reward module & tests added.

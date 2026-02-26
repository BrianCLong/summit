# Canary Plan: MIT Sloan 5 Heavy Lifts

1. Deploy to canary environment with `AGENT_DEPLOYMENT_ENFORCEMENT=off`.
2. Monitor `readiness_score.json` generation.
3. Enable enforcement for a subset of agents.
4. Verify no blocking of valid PRs.

# Multi-agent emergence evals (scaffold)

Purpose: detect unsafe emergent behaviors in agent-to-agent exchanges:
- collusion patterns
- policy bypass attempts
- prompt-injection propagation

All tests must include:
- deny-by-default fixture (expected FAIL)
- allowlisted safe fixture (expected PASS)

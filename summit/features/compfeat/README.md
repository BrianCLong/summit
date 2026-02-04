# CompFeat (Clean-room Subsumption Module)
## Status
- Feature flag: compfeat_enabled (default OFF)
- Policy: deny-by-default unless trusted_tester/admin
## Evidence
- Evidence IDs: EVD-COMPFEAT-...
## Rollout
1) Enable for trusted_tester in staging
2) Run eval harness and collect evidence bundle
3) Gradual expansion
## Kill switch
- Set compfeat_enabled=false

# Emergency Recovery & Governance Protocols

## Purpose
Define safe, legally-backed procedures to handle extreme compromise scenarios: root key compromise, attester corruption, mesh partition, governance hijack.

## Key Recovery Models

1.  **Threshold Shard Key Scheme**  
    - Root signing keys split across N custodians; requiring M-of-N to reconstruct.

2.  **Emergency Consensus Freeze**  
    - Board vote to freeze issuance, revert to last legitimate ledger state, block further trust actions temporarily.

3.  **Credential Rollforward Path**  
    - Issue new root keys, rekey attesters, publish revocation of compromised keys.

## Protocol Steps (on compromise detection)

1.  Detect anomaly (audit, red team, third-party report)  
2.  Invoke freeze: write “FREEZE” event into ledger  
3.  Board consensus / off-chain validation  
4.  Reconstruct new root keys (via threshold)  
5.  Reissue attestations / contract versions  
6.  Publish new root fingerprint linkage  
7.  Resume operations with improved monitoring / logging

## Exercise & Simulation

- Periodic drills where root is “compromised” in simulation  
- Measure time to freeze, rekey, recommission  
- Log all actions to ensure audit chain  

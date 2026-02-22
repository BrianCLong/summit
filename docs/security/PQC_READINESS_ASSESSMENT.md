# Post-Quantum Cryptography (PQC) Readiness Assessment

## Executive Summary
This document assesses the risk of quantum computing to the IntelGraph platform's cryptographic infrastructure and outlines a roadmap for achieving quantum resilience.

## Current Cryptographic Inventory
The following algorithms are currently in use and are vulnerable to quantum attacks (Shor's Algorithm):
- **Identity & Auth**: JWT (RS256/ES256) - Vulnerable.
- **Data at Rest**: AES-256 (GCM) - Relatively safe (Grover's Algorithm reduces effective key size to 128-bit, still considered secure).
- **Key Exchange**: TLS (ECDHE) - Vulnerable.
- **Signatures**: RSA/ECDSA - Vulnerable.

## Vulnerability Analysis
- **Harvest-Now, Decrypt-Later**: Attackers may capture current encrypted traffic to decrypt it once powerful quantum computers are available. This is a high risk for 'Top-Secret' data.
- **Identity Impersonation**: Quantum computers could forge signatures, allowing attackers to impersonate users or system components.

## PQC Roadmap
1. **Phase 1: Hybrid Cryptography (2026 Q1)**: Implement hybrid schemes that combine classical (ECC) and PQC (Kyber) algorithms.
2. **Phase 2: Crypto-Agility (2026 Q2)**: Abstract cryptographic operations to allow seamless algorithm swapping.
3. **Phase 3: Full PQC Transition (2027+)**: Move to pure PQC for all critical paths.

## Recommended PQC Algorithms (NIST Selected)
- **Key Encapsulation (KEM)**: CRYSTALS-Kyber
- **Digital Signatures**: CRYSTALS-Dilithium, Falcon, SPHINCS+

## Immediate Action Items
- Implement constant-time comparisons to defend against classical side-channel attacks.
- Introduce a PQC utility layer for experimental use.
- Update data classification policies to prioritize PQC for 'Restricted' and 'Top-Secret' data.

# FIPS 140-3 Cryptography Compliance

## Overview
Summit mandates the use of FIPS 140-validated cryptographic modules for all encryption operations within the Federal boundary.

## Implementation Strategy

### 1. Operating System
*   **Base Image:** We utilize `Red Hat Universal Base Image (UBI) 8` in FIPS mode.
*   **Kernel:** Kernel crypto API is configured to panic if non-FIPS algorithms are attempted.

### 2. Application Layer (Node.js/TypeScript)
*   **OpenSSL:** Node.js is compiled against a FIPS-validated OpenSSL provider.
*   **Enforcement:** Application startup includes a self-test routine that verifies FIPS mode is active (`crypto.getFips() === 1`).

### 3. Data at Rest
*   **AWS KMS:** All cloud-native storage (EBS, S3, RDS) uses AWS Key Management Service (FIPS 140-2 Level 2 validated).
*   **Database:** PostgreSQL utilizes `pgcrypto` with FIPS-compliant algorithms.

### 4. Data in Transit
*   **TLS Configuration:**
    *   Protocol: TLS 1.2 or 1.3 only.
    *   Cipher Suites: Limited to FIPS-approved suites (e.g., `ECDHE-RSA-AES256-GCM-SHA384`).
    *   Certificates: RSA-4096 or ECDSA P-384.

## Validation Evidence
*   **CMVP Certificate Numbers:**
    *   OpenSSL FIPS Provider: #4282 (Example)
    *   AWS KMS HSM: #3139

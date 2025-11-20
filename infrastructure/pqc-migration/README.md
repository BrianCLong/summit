# PQC Migration Infrastructure

## Overview

This directory contains tools and automation for migrating Summit to post-quantum cryptography.

## Directory Structure

```
pqc-migration/
├── tools/              # Migration utilities
│   ├── key-converter   # Convert classical keys to PQC
│   ├── cert-generator  # Generate PQC certificates
│   └── inventory-scan  # Scan codebase for crypto usage
├── automation/         # Automated migration scripts
│   ├── re-encrypt      # Re-encrypt data with PQC
│   ├── key-rotation    # Rotate keys to PQC algorithms
│   └── hybrid-upgrade  # Upgrade to hybrid schemes
└── assessment/         # Risk assessment tools
    ├── quantum-risk    # Quantum threat assessment
    └── timeline        # Migration timeline calculator
```

## Migration Tools

### Cryptographic Inventory Scanner

Scans codebase to identify all cryptographic usage:

```bash
./tools/inventory-scan --path /path/to/code --output inventory.json
```

### Key Converter

Converts classical keys to PQC equivalents:

```bash
./tools/key-converter --input rsa-key.pem --output kyber-key.pem --algorithm kyber-768
```

### Certificate Generator

Generates PQC certificates:

```bash
./tools/cert-generator --algorithm dilithium3 --subject "CN=summit.ai" --output cert.pem
```

## Automation Scripts

### Re-encryption

Re-encrypts data with post-quantum algorithms:

```bash
./automation/re-encrypt --source /data --algorithm kyber-1024 --hybrid
```

### Key Rotation

Rotates cryptographic keys:

```bash
./automation/key-rotation --service api-gateway --algorithm dilithium3 --dry-run
```

### Hybrid Upgrade

Upgrades systems to hybrid classical-quantum schemes:

```bash
./automation/hybrid-upgrade --services all --verify
```

## Risk Assessment

### Quantum Risk Calculator

Calculates quantum risk for assets:

```bash
./assessment/quantum-risk --asset database-keys --retention-years 10
```

Output:
```json
{
  "asset": "database-keys",
  "currentAlgorithm": "RSA-2048",
  "quantumVulnerable": true,
  "harvestNowDecryptLaterRisk": "critical",
  "recommendedActions": [
    "Migrate to Kyber-1024 immediately",
    "Re-encrypt existing data",
    "Implement hybrid scheme"
  ]
}
```

### Migration Timeline

Estimates migration timeline:

```bash
./assessment/timeline --scope full --team-size 10
```

## Best Practices

1. **Always test in staging first**
2. **Maintain rollback capability**
3. **Monitor performance during migration**
4. **Validate cryptographic correctness**
5. **Document all changes**

## Support

For migration support, contact the Quantum Security Team.

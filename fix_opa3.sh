#!/bin/bash
sed -i 's/curl -L -o opa /curl -L -o opa_bin /g' .github/workflows/verify-integrity.yml || true
sed -i 's/chmod +x opa/chmod +x opa_bin/g' .github/workflows/verify-integrity.yml || true
sed -i 's/\.\/opa eval/\.\/opa_bin eval/g' .github/workflows/verify-integrity.yml || true

sed -i 's/curl -L -o opa /curl -L -o opa_bin /g' .github/workflows/_reusable-security-compliance.yml || true
sed -i 's/chmod +x opa/chmod +x opa_bin/g' .github/workflows/_reusable-security-compliance.yml || true
sed -i 's/\.\/opa eval/\.\/opa_bin eval/g' .github/workflows/_reusable-security-compliance.yml || true

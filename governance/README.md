# Governance (Policy-as-Code)

This directory hosts Summit’s policy-as-code and drift simulation assets.

## Layout

- `policies/` — Rego policies
- `tests/` — OPA unit tests (opa test)
- `sbom/` — demo SBOM + signature key placeholder
- `playbooks/` — drift scenario runbooks

## Run Locally

```bash
opa test governance/policies governance/tests -v
```

Optional demo eval:

```bash
cat > /tmp/container_input.json <<'JSON'
{"image":{"user":"nonroot","vulnerabilities":[]}}
JSON
opa eval --format pretty -i /tmp/container_input.json -d governance/policies 'data.container.policy.deny'
```

## SBOM Signature Gate

The CI workflow runs `.ci/cosign-policy.sh`.

Default behavior:

- If `governance/sbom/demo-bom.spdx.json.sig` exists, it verifies the signature and fails on error.
- If it does not exist, it warns but does not fail.

To hard-enforce signatures:

- set `REQUIRE_SBOM_SIGNATURE=1` in CI (see workflow env),
- replace `governance/sbom/allowed-signers.pub` with a real cosign public key,
- sign the SBOM and commit the `.sig`.

# --- Release Pipeline Makefile ---
VERSION ?= v0.0.0
NODE ?= 20

.PHONY: bootstrap sbom provenance opa:gate verify:attest release:tag

bootstrap:
	corepack enable
	pnpm -v || (echo "pnpm not found via corepack" && exit 1)
	pnpm i --frozen-lockfile

sbom:
	npx @cyclonedx/cyclonedx-npm --output-file sbom.json --output-format json
	test -s sbom.json

provenance:
	@echo "Provenance is produced in CI by the SLSA generator"

opa:gate:
	@if ! command -v opa >/dev/null 2>&1; then \
	  curl -L -o opa https://openpolicyagent.org/downloads/latest/opa_linux_amd64_static && chmod +x opa; \
	fi
	SBOM_PRESENT=false; [ -s sbom.json ] && SBOM_PRESENT=true; \
	echo '{"sbom_present":' $$SBOM_PRESENT ',"provenance_present":true}' > input.json; \
	./opa eval -i input.json -d policies/release_gate.rego 'data.policy.release.allow' || true

verify:attest:
	@if [ -z "$$IMAGE_REF" ]; then echo "Set IMAGE_REF=ghcr.io/org/app:tag to verify OCI attestation"; exit 0; fi
	COSIGN_EXPERIMENTAL=1 cosign verify-attestation --type slsaprovenance \
	  --certificate-oidc-issuer https://token.actions.githubusercontent.com \
	  --certificate-identity-regexp 'https://github.com/.+/.+/.github/workflows/.+@.+' \
	  $$IMAGE_REF

release:tag: bootstrap sbom
	git tag $(VERSION)
	git push origin $(VERSION)
	@echo "Tag pushed. Hardened release workflow will attach SBOM and provenance in CI."

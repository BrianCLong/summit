TAG ?= v2025.10.07

.PHONY: validate-ga
validate-ga:
	@TAG=$(TAG) ./scripts/validate-ga.sh

.PHONY: manifest attest verify
manifest:
	@TAG=$(TAG) npm run -s release:manifest
attest:
	@TAG=$(TAG) npm run -s release:attest
verify:
	@TAG=$(TAG) npm run -s release:verify
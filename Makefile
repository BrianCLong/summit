.PHONY: verify-release verify-release-strict
verify-release: ## Verify manifest for TAG (warn on SHA mismatch)
	@[ -n "$(TAG)" ] || (echo "Usage: make verify-release TAG=vYYYY.MM.DD" && exit 1)
	node scripts/verify-release-manifest.mjs --tag=$(TAG)

verify-release-strict: ## Verify manifest and require HEAD==TAG commit
	@[ -n "$(TAG)" ] || (echo "Usage: make verify-release-strict TAG=vYYYY.MM.DD" && exit 1)
	node scripts/verify-release-manifest.mjs --tag=$(TAG) --strict
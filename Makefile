TAG ?= $(shell git describe --tags --abbrev=0 2>/dev/null || echo v0.0.0)
REL ?= $(shell date +release/%Y-%m-%d)

.PHONY: verify release tag deploy rollback smoke
verify: ## Run hardening + gates locally
	@bash scripts/verify-repo-hardening.sh

release: ## Create release branch and push
	@git checkout -b $(REL) && git push -u origin $(REL)

tag: ## Tag using current date version (override with TAG=vYYYY.MM.DD)
	@git tag $(TAG) && git push origin $(TAG)

deploy: ## Watch CD logs (placeholder: prints hint)
	@echo "Open Actions → CD job for $(TAG) and monitor helm upgrade."

rollback: ## Helm rollback to previous revision
	helm history intelgraph && echo "Run: helm rollback intelgraph <REVISION>"

smoke: ## Post-deploy smoke tests stub
	@curl -fsS https://your.domain/readyz >/dev/null
	@curl -fsS -X POST https://your.domain/graphql   -H 'content-type: application/json'   -d '{"query":"{ __typename }"}' >/dev/null
	@echo "Smoke OK"

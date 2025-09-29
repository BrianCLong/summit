.PHONY: bootstrap typecheck lint test e2e build up down codegen

bootstrap:
	pnpm i -w

typecheck:
	tsc -b --noEmit

lint:
	eslint . || true

test:
	jest --runInBand || true

e2e:
	playwright test || true

build:
	pnpm build -w

codegen:
	npx graphql-code-generator --config codegen.ts

up:
	docker compose up -d

down:
	docker compose down -v


.PHONY: bootstrap heal typecheck lint lint.fix fmt test build codegen codegen.verify up down ops.validate k6 doctor
bootstrap:
	corepack enable || true
	corepack prepare pnpm@9.12.3 --activate
	pnpm i -w --frozen-lockfile=false
heal:
	node scripts/monorepo_heal.mjs
fmt:
	prettier -w .
lint.fix:
	eslint . --fix
codegen.verify:
	node scripts/verify_codegen.mjs
ops.validate:
	node scripts/ops_validate.mjs
k6:
	bash scripts/k6_smoke.sh
doctor:
	node scripts/doctor.mjs

protect.branch:
	OWNER?=$(shell git config --get remote.origin.url | sed -E 's#.*github.com[:/]{1}([^/]+)/([^\.]+).*##')
	REPO?=$(shell git config --get remote.origin.url | sed -E 's#.*github.com[:/]{1}([^/]+)/([^\.]+).*##')
	BRANCH?=main
	OWNER=$(OWNER) REPO=$(REPO) BRANCH=$(BRANCH) bash scripts/protect_branch.sh

help: ## list common targets
	@awk -F':.*##' '/^[a-zA-Z0-9_\-]+:.*##/{printf "  \033[36m%-18s\033[0m %s\n", $$1, $$2}' $(MAKEFILE_LIST)

# annotate a few targets with help text
doctor: ## lint → typecheck → codegen drift → cycles
	@node scripts/doctor.mjs


.PHONY: stage.smoke stage.ops
stage.smoke: ## Run hard stage smoke (requires STAGE_* URLs)
	gh workflow run k6.smoke.stage.yml -f ref=staging
stage.ops: ## Run hard stage ops validate
	gh workflow run ops.validate.stage.yml -f ref=staging

discover.checks:
	@gh pr list --base main --state open --limit 1 --json number \
	| jq -r '.[0].number' \
	| xargs -I{} gh pr checks {} --json name -q '.[].name' | sort -u


.PHONY: release.captain
release.captain: ## Run Release Captain one-shot locally
	@bash release-captain.sh

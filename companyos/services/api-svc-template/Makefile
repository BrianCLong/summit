SVC_NAME := api-svc-template

.PHONY: bootstrap dev test lint build docker sbom smoke

bootstrap:
	corepack enable
	pnpm install --no-frozen-lockfile

dev:
	pnpm dev

test:
	pnpm test

lint:
	pnpm lint

build:
	pnpm build

docker:
	docker build -t $(SVC_NAME):local .

sbom:
	# example using syft; adapt to your tool
	syft packages dir:. -o json > sbom.json

smoke:
	node scripts/smoke-healthcheck.mjs

SHELL := /bin/bash
IMAGE ?= ghcr.io/yourorg/maestro:$(shell git rev-parse --short HEAD)

.PHONY: dev up build test docker sbom scan sign deploy-dev smoke smoke-dev

dev:
npm ci && npm run dev

build:
docker build -t $(IMAGE) .

docker-push: build
docker push $(IMAGE)

sbom:
syft $(IMAGE) -o spdx-json > sbom.spdx.json

scan:
trivy image --exit-code 1 $(IMAGE)

deploy-dev:
helm upgrade --install maestro charts/maestro \
  --namespace dev --create-namespace \
  --set image.repository=$(word 1,$(subst :, ,$(IMAGE))) \
  --set image.tag=$(word 2,$(subst :, ,$(IMAGE)))

smoke:
	@echo "🔎 Running repo smoke checks"
	bash scripts/smoke.sh

smoke-dev:
	@: $${DEV_BASE_URL:?DEV_BASE_URL is required, e.g. make smoke-dev DEV_BASE_URL=https://maestro.dev.intelgraph.local}
	bash scripts/smoke-dev.sh

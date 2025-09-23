SHELL := /bin/bash
IMAGE ?= ghcr.io/yourorg/maestro:$(shell git rev-parse --short HEAD)

.PHONY: dev up build test docker sbom scan sign deploy-dev

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
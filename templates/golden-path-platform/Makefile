SHELL := /bin/bash
GO_VERSION := 1.22.4
REGISTRY ?= ghcr.io/example
IMAGE_PREFIX ?= golden-path
GIT_SHA := $(shell git rev-parse --short HEAD)
BUILD_DATE := $(shell date -u +"%Y-%m-%dT%H:%M:%SZ")
LD_FLAGS := "-s -w -trimpath -X main.version=$(GIT_SHA) -X main.buildDate=$(BUILD_DATE)"
PLATFORMS := linux/amd64,linux/arm64
SERVICE_NAME := hello-service
JOB_NAME := hello-job

all: build

.PHONY: bootstrap
bootstrap:
	@which task >/dev/null 2>&1 || echo "Install go-task for richer DX: https://taskfile.dev"
	go env -w GOFLAGS=-mod=readonly
	go env -w GONOSUMDB=off

.PHONY: build
build: build-service build-job

.PHONY: build-service
build-service:
	cd services/$(SERVICE_NAME) && CGO_ENABLED=0 go build -ldflags $(LD_FLAGS) -o ../../dist/$(SERVICE_NAME)

.PHONY: build-job
build-job:
	cd jobs/$(JOB_NAME) && CGO_ENABLED=0 go build -ldflags $(LD_FLAGS) -o ../../dist/$(JOB_NAME)

.PHONY: test
test:
	cd services/${SERVICE_NAME} && go test ./... -count=1 -race -coverprofile=../../coverage-service.out
	cd jobs/${JOB_NAME} && go test ./... -count=1 -race -coverprofile=../../coverage-job.out
	go tool cover -func=coverage-service.out
	go tool cover -func=coverage-job.out

.PHONY: lint
lint:
	golangci-lint run ./services/... ./jobs/...

.PHONY: docker-build
docker-build:
	docker buildx build --platform $(PLATFORMS) --build-arg GIT_SHA=$(GIT_SHA) --build-arg BUILD_DATE=$(BUILD_DATE) \
		-t $(REGISTRY)/$(IMAGE_PREFIX)-$(SERVICE_NAME):$(GIT_SHA) services/$(SERVICE_NAME)
	docker buildx build --platform $(PLATFORMS) --build-arg GIT_SHA=$(GIT_SHA) --build-arg BUILD_DATE=$(BUILD_DATE) \
		-t $(REGISTRY)/$(IMAGE_PREFIX)-$(JOB_NAME):$(GIT_SHA) jobs/$(JOB_NAME)

.PHONY: sbom
sbom:
	scripts/generate-sbom.sh $(REGISTRY)/$(IMAGE_PREFIX)-$(SERVICE_NAME):$(GIT_SHA) artifacts/$(SERVICE_NAME)-sbom.spdx.json
	scripts/generate-sbom.sh $(REGISTRY)/$(IMAGE_PREFIX)-$(JOB_NAME):$(GIT_SHA) artifacts/$(JOB_NAME)-sbom.spdx.json

.PHONY: sign
sign:
	scripts/sign-image.sh $(REGISTRY)/$(IMAGE_PREFIX)-$(SERVICE_NAME):$(GIT_SHA) artifacts/$(SERVICE_NAME)-sbom.spdx.json
	scripts/sign-image.sh $(REGISTRY)/$(IMAGE_PREFIX)-$(JOB_NAME):$(GIT_SHA) artifacts/$(JOB_NAME)-sbom.spdx.json

.PHONY: attest
attest:
	scripts/generate-provenance.sh $(REGISTRY)/$(IMAGE_PREFIX)-$(SERVICE_NAME):$(GIT_SHA)
	scripts/generate-provenance.sh $(REGISTRY)/$(IMAGE_PREFIX)-$(JOB_NAME):$(GIT_SHA)

.PHONY: push
push:
	docker push $(REGISTRY)/$(IMAGE_PREFIX)-$(SERVICE_NAME):$(GIT_SHA)
	docker push $(REGISTRY)/$(IMAGE_PREFIX)-$(JOB_NAME):$(GIT_SHA)

.PHONY: helm-template
helm-template:
	helm template $(SERVICE_NAME) helm/hello-service -f helm/environments/${ENV}/hello-service.yaml --set image.tag=$(GIT_SHA)
	helm template $(JOB_NAME) helm/hello-job -f helm/environments/${ENV}/hello-job.yaml --set image.tag=$(GIT_SHA)

.PHONY: deploy-canary
deploy-canary:
	helm upgrade --install $(SERVICE_NAME) helm/hello-service -f helm/environments/${ENV}/hello-service.yaml --set image.tag=$(GIT_SHA) --set deploymentStrategy=canary --atomic --timeout 5m
	helm upgrade --install $(JOB_NAME) helm/hello-job -f helm/environments/${ENV}/hello-job.yaml --set image.tag=$(GIT_SHA) --atomic --timeout 5m

.PHONY: verify
verify:
	scripts/verify-signature.sh $(REGISTRY)/$(IMAGE_PREFIX)-$(SERVICE_NAME):$(GIT_SHA)
	scripts/verify-signature.sh $(REGISTRY)/$(IMAGE_PREFIX)-$(JOB_NAME):$(GIT_SHA)

.PHONY: clean
clean:
	rm -rf dist artifacts coverage.out

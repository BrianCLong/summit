SHELL := /bin/bash
SERVICE := summit-golden-path-api
IMAGE := ghcr.io/summit/golden-path/${SERVICE}
TAG ?= local

.PHONY: build test lint sbom scan sign verify deploy

build:
	npm run build
	tar czf dist/release.tar.gz dist package.json

lint:
	npm run lint
	npm run format --if-present

test:
	npm test

sbom:
	mkdir -p sbom
	docker run --rm -v "$$PWD:/src" anchore/syft:v0.104.0 dir:/src --output json > sbom/sbom.json

scan: sbom
	mkdir -p reports
	docker run --rm -v "$$PWD:/src" anchore/grype:v0.78.0 sbom:sbom/sbom.json --fail-on high --output json > reports/grype.json

sign: build
	COSIGN_EXPERIMENTAL=1 cosign sign-blob --yes dist/release.tar.gz

verify:
	COSIGN_EXPERIMENTAL=1 cosign verify-blob --certificate release.pem --signature release.sig dist/release.tar.gz

deploy:
	echo "Push ${IMAGE}:${TAG} with verified artifacts"

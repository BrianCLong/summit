SHELL := /bin/bash
SERVICE := {{SERVICE_SLUG}}
IMAGE := {{OCI_REGISTRY}}/${SERVICE}
TAG ?= local

.PHONY: build lint test sbom scan sign verify deploy package

package:
	tar czf dist/release.tar.gz dist

build:
	npm run build
	$(MAKE) package

lint:
	npm run lint
	npm run format

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
	echo "Deploying ${IMAGE}:${TAG}"

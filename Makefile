.PHONY: test validate docker sbom

install:
npm ci

test:
npx vitest run

validate:
node .github/scripts/validate_manifests.js

docker:
docker build -t maestro:dev .

sbom:
docker run --rm -v $(PWD):/src anchore/syft:latest dir:/src -o spdx-json > sbom.spdx.json

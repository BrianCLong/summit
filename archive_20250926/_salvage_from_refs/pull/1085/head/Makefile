.PHONY: test validate docker sbom lint lint-fix format-check clean-dry clean-build

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

lint:
	npm run lint:strict

lint-fix:
	npx eslint . --fix || true
	prettier -w . || true

format-check:
	npm run format:check

clean-dry:
	@git clean -fdX -n

clean-build:
	@if [ "$(CONFIRM)" != "1" ]; then \
		echo "Refusing to clean. Run 'make clean-build CONFIRM=1' to proceed."; \
		exit 1; \
	fi
	git clean -fdX

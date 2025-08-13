.PHONY: setup lint test fmt
setup: ## install common tooling
	pip install pre-commit || true
	pre-commit install || true
lint:
	ruff . || true
	npx -y eslint . || true
fmt:
	ruff --fix . || true
	npx -y prettier -w . || true
test:
	pytest -q || true
	npm test --if-present
deps:
	pip install -e .[test]

lint:
	ruff check . || true

typecheck:
	mypy . || true

test:
	pytest -q

run:
	uvicorn app.main:app --reload

docker:
	docker build -t prov-ledger:latest -f infra/Dockerfile .

.PHONY: deps lint typecheck test run docker

deps:
pip install -e .[dev]

lint:
ruff app tests

typecheck:
mypy app

test:
pytest

run:
uvicorn app.main:app --reload

docker:
docker build -t deescalation-coach:latest -f infra/Dockerfile .

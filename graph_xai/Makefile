deps:
pip install -e .[dev]

lint:
ruff app tests

typecheck:
mypy app

test:
pytest -q --maxfail=1

run:
uvicorn app.main:app --reload --port 8090

docker:
docker build -t graph-xai:latest -f infra/Dockerfile .

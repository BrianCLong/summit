.PHONY: bootstrap test lint clean run-sre-demo

bootstrap:
	pip install -e ".[dev]"

test:
	pytest

lint:
	black sre tests
	isort sre tests
	mypy sre

clean:
	rm -rf dist build *.egg-info .pytest_cache .mypy_cache
	find . -name "__pycache__" -delete

run-sre-demo:
	python -m sre.cli run --suite demo

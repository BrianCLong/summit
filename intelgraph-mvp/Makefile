up:
	docker compose up --build

test:
	cd api && pytest

maestro-test:
	cd api && pytest tests/test_maestro.py -v

maestro-api:
	cd api && uvicorn app.main:app --reload --port 8000

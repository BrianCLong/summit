.PHONY: run-eval run-api seed alert-test

run-eval:
	CHAOS_ON=0 JUDGE_MODE=llm python -m evals.agentic.cli --runbook $(RB) --cases evals/agentic/fixtures/$(RB_SHORT)/cases.jsonl

run-api:
	uvicorn services.evalsvc.app:app --host 0.0.0.0 --port 8080

seed:
	psql $$PG_URL -f ops/retention.sql # Using retention.sql as a placeholder for migrations.sql

alert-test:
	python ops/slack_notify.py
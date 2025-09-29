.PHONY: go-build acceptance contract-test seed dashboards
go-build:
	go build ./...
acceptance:
	npm run acceptance && go test ./acceptance -count=1
contract-test:
	npm run contract && go test ./contracts -count=1
seed:
	node scripts/seed-graph.js fixtures/case-demo
dashboards:
	kubectl apply -f ops/grafana/dashboards

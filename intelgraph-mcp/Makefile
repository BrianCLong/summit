PNPM := npm run xpnpm --

export FC_MOCK ?= 1
export REPLAY_ENGINE_URL ?= http://localhost:8081
ENDPOINT ?= http://localhost:8080
TOKEN ?= dev

.PHONY: install build test lint typecheck dev dev-replay dev-runtime bench conformance policy-sim clean

install:
	$(PNPM) install

build:
	$(PNPM) -r build

test:
	$(PNPM) -r test

lint:
	$(PNPM) -r lint

typecheck:
	$(PNPM) -r typecheck

conformance:
	$(PNPM) --filter conformance-cli start -- -e http://localhost:8080

policy-sim:
	opa eval -d policies/mcp/abac.rego -I policies/mcp/fixtures/data.json -I policies/mcp/fixtures/allow.json 'data.intelgraph.mcp.allow'
	opa eval -d policies/mcp/abac.rego -I policies/mcp/fixtures/data.json -I policies/mcp/fixtures/deny.json 'data.intelgraph.mcp.allow'

dev-replay:
	$(PNPM) --filter replay-engine dev

dev-runtime:
	$(PNPM) --filter runtime-pooler dev

bench:
	ENDPOINT=$(ENDPOINT) TOKEN=$(TOKEN) k6 run benchmarks/harness/k6/sse-latency.js

clean:
	rm -rf .pnpm-store node_modules */*/node_modules

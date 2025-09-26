.PHONY: up slo gates a2a evidence verify all sbom
ENV?=.env
include $(ENV)
export

up:
	@python3 mock/a2a_server.py & echo $! > .a2a.pid; sleep 0.5

slo:
	@python3 tools/mc.py slo snapshot --out out/slo-$(MC_VERSION)-baseline.json

gates:
	@python3 tools/gates_runner.py --stage stage --strict --report out/gates-stage-$(MC_VERSION).json
	@python3 tools/gates_runner.py --stage canary_20 --strict --report out/gates-canary20-$(MC_VERSION).json
	@python3 tools/gates_runner.py --stage canary_50 --strict --report out/gates-canary50-$(MC_VERSION).json
	@python3 tools/gates_runner.py --stage production --strict --report out/gates-prod-$(MC_VERSION).json

a2a:
	@curl -sS -X POST $(A2A_URL)/a2a/perform -H 'Content-Type: application/json' \
	 -d '{"tenantId":"TENANT_001","purpose":"investigation","residency":"US","pqid":"pq.getPersonById","agent":"code-refactor","task":{"repo":"svc-api","goal":"add pagination"}}' \
	 | tee out/a2a-smoke.json | jq -e '.ok==true' >/dev/null

evidence:
	@python3 tools/mc.py evidence pack --out dist/evidence-$(MC_VERSION).json

verify:
	@python3 tools/mc.py evidence verify dist/evidence-$(MC_VERSION).json > out/verify.json
	@jq -e '.ok==true' out/verify.json >/dev/null && echo "✅ evidence verified"

cleanup:
	@pkill -f "python3 mock/a2a_server.py" 2>/dev/null || true
	@rm -f .a2a.pid

all: cleanup up slo gates a2a evidence verify cleanup

# Legacy CI evidence collection
sbom:
	npx @cyclonedx/cyclonedx-npm --output-format json --output-file sbom.json

# Promote CI reports into evidence folder
EVIDENCE_DIR?=evidence/ci/$(shell date +%Y-%m-%d)/$(shell git rev-parse --short HEAD)

legacy-evidence:
	mkdir -p $(EVIDENCE_DIR)
	cp -r reports/* $(EVIDENCE_DIR) || true
	shasum -a 256 $(EVIDENCE_DIR)/* > $(EVIDENCE_DIR)/SHA256SUMS || true
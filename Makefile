.PHONY: mc-verify
mc-verify:
	npm run -ws test -- --coverage --runInBand
	opa test policies/ -v || exit 1
	npx k6 run tests/k6/smoke.js --out json=k6-results/smoke.json
	node tools/coverage-gate.js 80
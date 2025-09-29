.PHONY: validate policy:test policy:bundle

validate:
	node scripts/validate-dsls.mjs

policy\:test:
	opa check policies/opa && opa test policies/opa -v || true

policy\:bundle:
	opa build -b policies/opa -o composer-policy-bundle.tar.gz
	@echo "Bundle at ./composer-policy-bundle.tar.gz"


sprint17:
 npm run lint && npm test && npm run build-docs || true
 node scripts/generate-persisted-queries.js || true
 @echo "gh project create 'Sprint 17 (Risk & Watchlists)'"
 @echo "gh issue import -F project_management/sprint17_issues.csv"

.PHONY: validate policy:test policy:bundle

validate:
	node scripts/validate-dsls.mjs

policy\:test:
	opa check policies/opa && opa test policies/opa -v || true

policy\:bundle:
	opa build -b policies/opa -o composer-policy-bundle.tar.gz
	@echo "Bundle at ./composer-policy-bundle.tar.gz"


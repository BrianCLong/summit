verify-claim:
	@ID=$${ID:-$${id}}; \
	if [ -z "$$ID" ]; then \
		echo "Usage: make verify-claim ID=<claimId>"; exit 1; \
	fi; \
	pnpm tsx src/cli/verify.ts $$ID

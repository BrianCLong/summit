.PHONY: test eval

test:
	opa test ./policies ./tests -v

eval:
	opa eval -i ../inputs.json -d ./policies "data.summit.supply_chain.verdict"

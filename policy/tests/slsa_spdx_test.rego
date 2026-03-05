package supply_chain.validation_test

import data.supply_chain.validation
import rego.v1

test_valid_slsa_1_2 if {
	validation.valid_slsa with input as {"predicateType": "https://slsa.dev/provenance/v1.2"}
}

test_invalid_slsa if {
	not validation.valid_slsa with input as {"predicateType": "https://slsa.dev/provenance/v1.0"}
}

test_has_source_track if {
	validation.has_source_track with input as {"predicate": {"buildDefinition": {"source": {
		"uri": "git+https://github.com/example/repo",
		"digest": {"sha1": "abcdef1234567890"},
	}}}}
}

test_missing_source_track if {
	not validation.has_source_track with input as {"predicate": {"buildDefinition": {}}}
}

test_valid_spdx_3_0_1 if {
	validation.valid_spdx with input as {"@context": "https://spdx.org/rdf/3.0.1/spdx-context.jsonld"}
}

test_invalid_spdx if {
	not validation.valid_spdx with input as {"@context": "https://spdx.org/rdf/2.3/spdx-context.jsonld"}
}

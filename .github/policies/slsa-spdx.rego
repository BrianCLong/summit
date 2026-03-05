package supply_chain.validation

import rego.v1

# Check SLSA 1.2
default valid_slsa = false
valid_slsa if {
    input.predicateType == "https://slsa.dev/provenance/v1.2"
}

# Source Track checks
default has_source_track = false
has_source_track if {
    input.predicate.buildDefinition.source
    input.predicate.buildDefinition.source.uri
    input.predicate.buildDefinition.source.digest
}

# Check SPDX 3.0.1
default valid_spdx = false
valid_spdx if {
    input["@context"] == "https://spdx.org/rdf/3.0.1/spdx-context.jsonld"
}

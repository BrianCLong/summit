package osint.provenance

default allow = false

deny["missing_artifacts"] if {
  count(input.collection.provenance.artifact_ids) == 0
}

deny["escalation_single_source"] if {
  input.collection.provenance.escalation
  input.collection.provenance.single_source
}

deny["insufficient_corroboration"] if {
  input.collection.provenance.escalation
  input.collection.provenance.corroboration_count < 2
}

allow if {
  count(deny) == 0
}

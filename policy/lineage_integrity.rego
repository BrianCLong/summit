package summit.lineage

default allow = false

#
# Input shape:
# {
#   "lineage": {
#      "has_full_provenance": true,
#      "edges_valid": true,
#      "no_gaps": true
#   }
# }
#

valid_lineage {
  ln := input.lineage
  ln.has_full_provenance == true
  ln.edges_valid == true
  ln.no_gaps == true
}

allow {
  valid_lineage
}

package securiteyes.modes

unit_min := value if {
  value := input._securiteyes.thresholds.unit_coverage_min
} else := 95

require_provenance := value if {
  value := input._securiteyes.thresholds.require_provenance
} else := true

advisory_only := value if {
  value := input._securiteyes.enforcement.advisory_only
} else := true

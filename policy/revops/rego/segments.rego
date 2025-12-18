package revops.segments

# Segment rules centralize SMB/Mid/Enterprise classification for reuse across decisions.
# Segments can be overridden via tenant config using tenant_overrides.rego.

default segment_for_lead = "unknown"

data_segments := {
  "enterprise": {
    "segment": "enterprise",
    "company_size": ["1000+"],
  },
  "midmarket": {
    "segment": "midmarket",
    "company_size": ["200-999"],
  },
  "smb": {
    "segment": "smb",
    "company_size": ["1-199", "1-50", "51-199"],
  },
}

segment_for_lead = segment {
  some key
  rule := data_segments[key]
  lead := input.lead
  lead.company_size == rule.company_size[_]
  segment := rule.segment
}

segment_for_lead = segment {
  lead := input.lead
  lead.segment_hint != ""
  segment := lead.segment_hint
}

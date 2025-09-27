from intelgraph_py.analytics.counter_psyops import (
  RED,
  SourceClaim,
  detect_misleading_information,
)


def test_detect_misleading_information_flags_conflicts():
  claims = [
    SourceClaim("source1", "entity", "claimA"),
    SourceClaim("source2", "entity", "claimB"),
  ]
  flagged = detect_misleading_information(claims)
  assert len(flagged) == 2
  assert all(RED in line for line in flagged)


def test_detect_misleading_information_no_conflicts():
  claims = [
    SourceClaim("source1", "entity", "claimA"),
    SourceClaim("source2", "entity", "claimA"),
  ]
  flagged = detect_misleading_information(claims)
  assert flagged == []

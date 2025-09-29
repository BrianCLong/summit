package securiteyes.gates

test_gate_passes_happy_path if {
  pass with input as {
    "pr": {
      "sbom": {"clean": true},
      "secrets": {"leaks": 0},
      "provenance": {"verified": true},
      "tests": {"unit": 97, "critical_e2e_pass": true},
      "labels": [],
      "polygraph": {"score": 20, "confidence": "low"}
    }
  }
}

test_polygraph_advisory_message if {
  messages[msg] with input as {
    "pr": {
      "sbom": {"clean": true},
      "secrets": {"leaks": 0},
      "provenance": {"verified": true},
      "tests": {"unit": 98, "critical_e2e_pass": true},
      "labels": [],
      "polygraph": {"score": 80, "confidence": "high"}
    }
  }
  msg == "polygraph advisory: deception score 80 (high)"
}

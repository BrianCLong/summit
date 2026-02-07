import future.keywords
package fcr.alerts

severity := "critical" {
  input.confidence >= 0.85
  input.growth >= 10
}

severity := "high" {
  input.confidence >= 0.7
  input.growth >= 5
}

severity := "medium" {
  input.confidence >= 0.5
  input.growth >= 3
}

severity := "low" {
  not severity
}

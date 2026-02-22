import future.keywords
package goldenpaths

default allow = false

allow {
  input.kind == "Service"
  input.spec.paths[_] == "/healthz"
  input.metadata.labels["golden.step"]
}

message = "service must expose /healthz and declare at least one golden step" { allow == false }

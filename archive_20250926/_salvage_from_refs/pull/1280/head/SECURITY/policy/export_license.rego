package intelgraph.export

default allow := false

allow {
  not input.license in {"Restricted-TOS", "Embargoed"}
}

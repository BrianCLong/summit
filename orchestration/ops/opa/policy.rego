package chronos.admission

default allow = false

allowed_namespaces := {"media", "tests", "demo"}

allow {
  input.actor != ""
  allowed_namespaces[input.ir.namespace]
  not denied_activity
}

# Example guard that blocks shell execution primitives.
denied_activity {
  some node
  node := input.ir.nodes[_]
  startswith(node.uses, "exec.shell")
}

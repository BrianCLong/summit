package intelgraph

default allow = false

# Input example:
# {
#   "action": "read:chat",
#   "user": {"clearance": "public", "role": "ANALYST"},
#   "resource": {"sensitivity": "low"}
# }

allow {
  input.action == "read:chat"
  input.resource.sensitivity != "high"
}

allow {
  input.action == "write:comment"
  input.user.role == "ADMIN"
}


package companyos

default allow = false
default reason = "no_rule"

# Subject shape:
# input.subject: { userId, roles: ["Exec","Presenter"], tenant }
# Resource shape:
# input.resource: { type: "deck"|"email"|"timeline"|"rag_snippet"|"answer" , id, owner, tags: ["confidential","internal"] }
# Action: "present"|"read_snippet"|"answer_question"|"render_widget"

is_presenter {
  some r
  r := input.subject.roles[_]
  r == "Presenter"
}

is_exec {
  some r
  r := input.subject.roles[_]
  r == "Exec"
}

is_internal_only { input.resource.tags[_] == "internal" }
is_confidential { input.resource.tags[_] == "confidential" }

# Deck present policy:
allow {
  input.action == "present"
  input.resource.type == "deck"
  is_presenter
  not is_confidential   # presenters may not present "confidential" unless Exec
}
reason := "presenter_can_present" { allow }

allow {
  input.action == "present"
  input.resource.type == "deck"
  is_exec
}
reason := "exec_override" { allow }

# Email/timeline read:
allow {
  input.action == "read_snippet"
  input.resource.type == "rag_snippet"
  not is_confidential
}
reason := "non_confidential_snippet" { allow }

allow {
  input.action == "read_snippet"
  input.resource.type == "rag_snippet"
  is_exec
}
reason := "exec_can_read_all" { allow }

# Final answer release (can be stricter than snippet access)
allow {
  input.action == "answer_question"
  is_exec
}
reason := "exec_can_release" { allow }

allow {
  input.action == "answer_question"
  not is_confidential           # conservative by default
}
reason := "non_confidential_release" { allow }
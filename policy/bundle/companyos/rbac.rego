import future.keywords
package companyos.rbac

# OPA v1 imports - keywords are built-in
import rego.v1

default allow := false

# input:
# {
#   "subject": {"id":"u1","roles":["AM","Presenter"], "webauthn_verified":true},
#   "action": "present",   # read|write|present|export
#   "resource": {"type":"deck","id":"d1","classification":"internal"},
#   "context": {"accountId":"a1"}
# }

is_presenter if { some r in input.subject.roles; r == "Presenter" }
is_exec if { some r in input.subject.roles; r == "Exec" }
is_am if { some r in input.subject.roles; r == "AM" }

internal if { input.resource.classification == "internal" }
public if { input.resource.classification == "public" }

# Present deck - Presenter with webauthn
allow if {
  input.action == "present"
  input.resource.type == "deck"
  is_presenter
  internal
  input.subject.webauthn_verified == true
}

# Present deck - Exec with webauthn
allow if {
  input.action == "present"
  input.resource.type == "deck"
  is_exec
  internal
  input.subject.webauthn_verified == true
}

# Read email - Exec
allow if {
  input.action == "read"
  input.resource.type == "email"
  is_exec
}

# Read email - AM
allow if {
  input.action == "read"
  input.resource.type == "email"
  is_am
}

allow if {
  input.action == "read"
  input.resource.type == "timelineEvent"
  internal
}

allow if {
  input.action == "read_snippet"
  input.resource.type == "rag_snippet"
  input.resource.tags[_] == "confidential"
  is_exec
}

# Helper: check if tags contain confidential
has_confidential_tag if {
  some t in input.resource.tags
  t == "confidential"
}

# Read non-confidential RAG snippet - Exec
allow if {
  input.action == "read_snippet"
  input.resource.type == "rag_snippet"
  not has_confidential_tag
  is_exec
}

# Read non-confidential RAG snippet - AM
allow if {
  input.action == "read_snippet"
  input.resource.type == "rag_snippet"
  not has_confidential_tag
  is_am
}

# Read non-confidential RAG snippet - Presenter
allow if {
  input.action == "read_snippet"
  input.resource.type == "rag_snippet"
  not has_confidential_tag
  is_presenter
}

# Answer question - Exec
allow if {
  input.action == "answer_question"
  input.resource.type == "rag_answer"
  is_exec
}

# Answer question - AM
allow if {
  input.action == "answer_question"
  input.resource.type == "rag_answer"
  is_am
}

# Answer question - Presenter
allow if {
  input.action == "answer_question"
  input.resource.type == "rag_answer"
  is_presenter
}

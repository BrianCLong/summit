package companyos.rbac

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

allow if {
  input.action == "present"
  input.resource.type == "deck"
  ( is_presenter or is_exec )
  internal
  input.subject.webauthn_verified == true
}

allow if {
  input.action == "read"
  input.resource.type == "email"
  (is_exec or is_am)
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

allow if {
  input.action == "read_snippet"
  input.resource.type == "rag_snippet"
  not input.resource.tags[_] == "confidential"
  (is_exec or is_am or is_presenter)
}

allow if {
  input.action == "answer_question"
  input.resource.type == "rag_answer"
  (is_exec or is_am or is_presenter)
}

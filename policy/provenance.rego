package summit.provenance

import future.keywords.if
import future.keywords.contains

default valid := false

valid if {
  no_orphan_deploys
  required_fields_present
}

required_fields_present if {
  input.id
  input.timestamp
  input.actor.type
  input.actor.id
  input.action
  input.subject.type
  input.subject.id
}

no_orphan_deploys if {
  not orphan_deploys
}

orphan_deploys if {
  input.action == "deploy"
  not input.context.commit
}

deny contains msg if {
  orphan_deploys
  msg := "deploy provenance event missing commit context"
}

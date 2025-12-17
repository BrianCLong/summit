package summit.provenance

default valid = false

valid {
  no_orphan_deploys
  required_fields_present
}

required_fields_present {
  input.id
  input.timestamp
  input.actor.type
  input.actor.id
  input.action
  input.subject.type
  input.subject.id
}

no_orphan_deploys {
  not orphan_deploys
}

orphan_deploys {
  input.action == "deploy"
  not input.context.commit
}

deny[msg] {
  orphan_deploys
  msg := "deploy provenance event missing commit context"
}

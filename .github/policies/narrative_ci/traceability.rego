package narrative_ci.traceability

default allow = false

allow {
  every_inferred_has_receipt
  every_receipt_has_artifact
}

every_inferred_has_receipt {
  inferred := input.inferred_nodes
  receipts := { r.target.id | r := input.receipts[_] }
  not exists_missing(inferred, receipts)
}

exists_missing(inferred, receipts) {
  some i
  inferred[i].id != ""
  not receipts[inferred[i].id]
}

every_receipt_has_artifact {
  some r
  r := input.receipts[_]
  count(r.sources) > 0
  r.sources[0].artifact_id != ""
  r.sources[0].content_sha256 != ""
}

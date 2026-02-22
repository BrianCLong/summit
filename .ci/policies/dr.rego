import future.keywords
package dr

default allow = false

stale_backup(store) {
  input.backup_last_success_timestamp[store] < input.required_timestamp
}

allow {
  not stale_backup("postgres")
  not stale_backup("neo4j")
  not stale_backup("redis")
  not stale_backup("typesense")
}

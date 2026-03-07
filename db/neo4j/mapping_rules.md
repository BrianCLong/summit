# Mapping Rules (Postgres → Neo4j)

- Primary key (single): `__pk__ = <table_pk_value>`
- Primary key (composite): `__pk__ = sha256(join("::", [col1, col2, ...]))`
- All nodes/rels:
  - `applied_lsn: "<pg_lsn>"`
  - `__tombstone__: false` by default
- Deletes:
  - Set `__tombstone__ = true`, keep record; never detach-delete during CDC
- Updates:
  - Keep `__pk__` stable; only props change; always bump `applied_lsn`
- Relationships:
  - Derive `__pk__` similarly from (src.__pk__, type, dst.__pk__, optional rel key)

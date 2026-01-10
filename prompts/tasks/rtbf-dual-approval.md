# RTBF Dual-Actor Approval and Purge Manifest

Implement a two-actor approval workflow for RTBF requests, enforce a time delay before hard deletes execute, and generate a signed purge manifest stored per tenant. Update unit tests to cover the two-actor requirement and manifest output.

Scope:

- server/src/governance/retention/
- server/src/db/retention/
- docs/roadmap/STATUS.json

Constraints:

- Require two distinct approvers before RTBF requests move to approved.
- Enforce a delay before execution when configured.
- Generate a signed purge manifest on completion and persist it under the tenant partition.
- Add or update tests for approval and manifest output.

package compliance.auditability
import future.keywords.if
import future.keywords.in

default allow = false

# Auditability rules
# Every write operation must have a trace ID
allow if {
    input.operation in ["create", "update", "delete"]
    input.trace_id != null
    input.trace_id != ""
}

# Read operations are allowed without trace ID for now, but logged
allow if {
    input.operation == "read"
}

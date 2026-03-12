package connectors.authz

default allow = false

# Rules for connector lifecycle
allow if {
    input.action == "connector:add"
    input.subject.roles[_] == "admin"
}

allow if {
    input.action == "connector:sync"
    input.subject.roles[_] == "admin"
}

allow if {
    input.action == "connector:sync"
    input.subject.roles[_] == "editor"
}

# Rules for viewing data
allow if {
    input.action == "connector:view_raw"
    input.subject.roles[_] == "admin"
}

allow if {
    input.action == "connector:view_raw"
    input.subject.roles[_] == "privacy-officer"
}

# Rules for exports
allow if {
    input.action == "connector:export"
    input.subject.roles[_] == "admin"
}

allow if {
    input.action == "connector:export"
    input.subject.roles[_] == "privacy-officer"
}

# Block if specifically denied by another rule (deny-by-default is already set)
deny if {
    input.subject.blocked == true
}

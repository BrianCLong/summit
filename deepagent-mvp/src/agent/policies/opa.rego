package deepagent.authz

default allow = false

# Allow admins in tenant-a to do anything.
allow {
    input.actor == "admin"
    input.tenant == "tenant-a"
}

# Allow users in tenant-b to use the searchCatalog and lookupUser tools.
allow {
    input.actor == "user"
    input.tenant == "tenant-b"
    input.toolId in ["searchCatalog", "lookupUser"]
}

# Allow access to restricted tools if a justification is present.
allow {
    input.toolId == "restrictedTool"
    is_string(input.params.justification)
    count(input.params.justification) > 0
}

package main

default allow = false

# Allow read access to graphs by default
allow {
    input.method == "GET"
    startswith(input.path, "/graph")
}

# Allow authenticated users to perform actions
allow {
    input.user != null
    input.action != "delete"
}

# Deny all DELETE operations unless explicitly allowed
allow {
    input.method == "DELETE"
    input.user.role == "admin"
}
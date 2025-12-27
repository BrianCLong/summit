package intelgraph.purpose

default allow = false

# Allow if user has the purpose required by the data
# In a real system, we'd lookup the tag for the field/resource.
# Here we simulate that input.resource.required_purpose is passed.

allow {
    not input.resource.required_purpose
}

allow {
    some i
    input.user.authorized_purposes[i] == input.resource.required_purpose
}

allow {
    input.user.role == "admin"
}

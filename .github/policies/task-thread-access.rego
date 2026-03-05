package policy.taskThreadAccess

default allow = false

# Allow if user is an admin
allow {
    input.user.role == "admin"
}

# Allow if user is a participant of the task thread
allow {
    input.action == "read"
    some i
    input.thread.participants[i] == input.user.id
}

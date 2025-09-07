package dockersecurity

# Deny final images running as root
deny[msg] {
    input.Stage == "final"
    not input.User
    msg := "final image must run as non-root user"
}

# Deny use of latest tags for base images
deny[msg] {
    endswith(input.BaseImage, ":latest")
    msg := "base images must be pinned (no :latest tag allowed)"
}

# Require OCI labels for source traceability
deny[msg] {
    not input.Labels["org.opencontainers.image.source"]
    msg := "missing required OCI label: org.opencontainers.image.source"
}

deny[msg] {
    not input.Labels["org.opencontainers.image.version"]
    msg := "missing required OCI label: org.opencontainers.image.version"
}

deny[msg] {
    not input.Labels["org.opencontainers.image.revision"]
    msg := "missing required OCI label: org.opencontainers.image.revision"
}

# Require security scanning labels
deny[msg] {
    not input.Labels["org.opencontainers.image.vendor"]
    msg := "missing required OCI label: org.opencontainers.image.vendor"
}

# Deny running privileged containers
deny[msg] {
    input.Stage == "final"
    input.Privileged == true
    msg := "containers must not run in privileged mode"
}

# Deny containers with excessive capabilities
deny[msg] {
    input.Stage == "final"
    input.CapAdd
    count(input.CapAdd) > 0
    msg := "containers should not add capabilities unless absolutely necessary"
}

# Require health checks for services
warn[msg] {
    input.Stage == "final"
    not input.Healthcheck
    msg := "consider adding HEALTHCHECK instruction for service containers"
}

# Warn about package managers in final image
warn[msg] {
    input.Stage == "final"
    contains(input.Cmd, "apt")
    msg := "package managers should not be present in final images"
}

warn[msg] {
    input.Stage == "final" 
    contains(input.Cmd, "yum")
    msg := "package managers should not be present in final images"
}
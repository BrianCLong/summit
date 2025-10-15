package summit.retention

import rego.v1

is_retention_cronjob if {
    input.kind == "CronJob"
    input.metadata.labels["app.kubernetes.io/name"] == "data-retention"
}

required_label := "summit.io/compliance-scope"

minute_field(schedule) := minute if {
    cleaned := trim(schedule, " ")
    fields := split(cleaned, " ")
    count(fields) >= 1
    minute := fields[0]
}

deny contains msg if {
    is_retention_cronjob
    not input.metadata.labels[required_label]
    msg := sprintf("Data retention CronJobs must declare the %q label", [required_label])
}

deny contains msg if {
    is_retention_cronjob
    minute := minute_field(input.spec.schedule)
    minute in ["*", "*/1", "*/2", "*/5", "*/10", "*/15"]
    msg := "Data retention CronJobs must not run more frequently than once per hour"
}

deny contains msg if {
    is_retention_cronjob
    input.spec.concurrencyPolicy != "Forbid"
    msg := "Data retention CronJobs must set concurrencyPolicy to Forbid"
}

deny contains msg if {
    is_retention_cronjob
    container := input.spec.jobTemplate.spec.template.spec.containers[_]
    not container.securityContext.readOnlyRootFilesystem
    msg := sprintf("Container %s must run with a read-only root filesystem", [container.name])
}

deny contains msg if {
    is_retention_cronjob
    not input.spec.jobTemplate.spec.template.spec.securityContext.runAsNonRoot
    msg := "Data retention CronJobs must run as non-root"
}

deny contains msg if {
    is_retention_cronjob
    container := input.spec.jobTemplate.spec.template.spec.containers[_]
    not container.resources.limits
    msg := sprintf("Container %s must define resource limits", [container.name])
}

deny contains msg if {
    is_retention_cronjob
    container := input.spec.jobTemplate.spec.template.spec.containers[_]
    not container.volumeMounts
    msg := sprintf("Container %s must mount a policy bundle volume", [container.name])
}

deny contains msg if {
    is_retention_cronjob
    not input.spec.jobTemplate.spec.template.metadata.annotations["checksum/config"]
    msg := "Data retention CronJobs must include a checksum/config annotation for change tracking"
}

allow if { not deny[_] }

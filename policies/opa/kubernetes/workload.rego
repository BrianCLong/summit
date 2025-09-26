package kubernetes.compliance

import future.keywords.in

workload_kinds := {"Deployment", "StatefulSet", "DaemonSet", "Job", "CronJob"}

pod_spec(spec) {
  input.kind == "CronJob"
  spec := input.spec.jobTemplate.spec.template.spec
}

pod_spec(spec) {
  input.kind != "CronJob"
  spec := input.spec.template.spec
}

all_containers[container] {
  pod_spec(spec)
  spec.containers[_] = container
}

all_containers[container] {
  pod_spec(spec)
  spec.initContainers[_] = container
}

container_name(container) := name {
  name := container.name
}

container_name(container) := "<unnamed>" {
  not container.name
}

pod_run_as_non_root {
  pod_spec(spec)
  spec.securityContext.runAsNonRoot == true
}

container_run_as_non_root(container) {
  container.securityContext.runAsNonRoot == true
}

container_read_only_root_fs(container) {
  container.securityContext.readOnlyRootFilesystem == true
}

image_has_digest(image) {
  re_match(".*@sha256:[0-9a-fA-F]{64}$", image)
}

image_last_segment(image, segment) {
  parts := split(image, "/")
  count(parts) > 0
  segment := parts[count(parts) - 1]
}

image_tag(image, tag) {
  not image_has_digest(image)
  image_last_segment(image, segment)
  pieces := split(segment, ":")
  count(pieces) == 2
  tag := pieces[1]
}

image_has_tag(image) {
  image_tag(image, _)
}

deny[msg] {
  input.kind in workload_kinds
  pod_spec(_)
  container := all_containers[_]
  not pod_run_as_non_root
  not container_run_as_non_root(container)
  msg := sprintf("%s %q container %q must run as non-root", [input.kind, input.metadata.name, container_name(container)])
}

deny[msg] {
  input.kind in workload_kinds
  pod_spec(_)
  container := all_containers[_]
  not container_read_only_root_fs(container)
  msg := sprintf("%s %q container %q must enable readOnlyRootFilesystem", [input.kind, input.metadata.name, container_name(container)])
}

deny[msg] {
  input.kind in workload_kinds
  pod_spec(_)
  container := all_containers[_]
  image := container.image
  not image_has_digest(image)
  not image_has_tag(image)
  msg := sprintf("%s %q container %q image must pin a tag or digest", [input.kind, input.metadata.name, container_name(container)])
}

deny[msg] {
  input.kind in workload_kinds
  pod_spec(_)
  container := all_containers[_]
  image := container.image
  not image_has_digest(image)
  image_tag(image, tag)
  lower(tag) == "latest"
  msg := sprintf("%s %q container %q image tag must not be 'latest'", [input.kind, input.metadata.name, container_name(container)])
}

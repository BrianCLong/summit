import future.keywords
package policy.container

approved_runtime_bases := {
  "gcr.io/distroless/nodejs20-debian12",
  "gcr.io/distroless/python3",
  "gcr.io/distroless/static:nonroot",
  "cgr.dev/chainguard/node",
  "cgr.dev/chainguard/python",
  "cgr.dev/chainguard/static",
}

approved_builder_bases := {
  "node:20-bullseye-slim",
  "python:3.11-slim",
  "golang:1.22-alpine",
  "cgr.dev/chainguard/go",
}

############################################
# Dockerfile policies
############################################

is_dockerfile {
  input.stages
}

final_stage(stage) {
  is_dockerfile
  count(input.stages) > 0
  stage := input.stages[count(input.stages)-1]
}

runtime_base_disallowed(base) {
  not approved_runtime_bases[base]
}

builder_base_disallowed(base) {
  not approved_builder_bases[base]
}

has_user_instruction(stage) {
  some inst
  inst := stage.instructions[_]
  lower(inst.name) == "user"
}

uses_package_manager(stage) {
  some inst
  inst := stage.instructions[_]
  lower(inst.name) == "run"
  pm := lower(inst.cmd)
  contains(pm, "apt-get") or contains(pm, "yum") or contains(pm, "dnf") or contains(pm, "apk add")
}

builder_stages[stage] {
  stage := input.stages[_]
  lower(stage.name) == "build"
}

# Require a non-root user in the final stage
deny[msg] {
  is_dockerfile
  final_stage(stage)
  not has_user_instruction(stage)
  msg := "runtime image must set non-root USER"
}

# Runtime base must be in the approved allowlist
deny[msg] {
  is_dockerfile
  final_stage(stage)
  runtime_base_disallowed(stage.base.image)
  msg := sprintf("runtime base %s is not approved (use distroless/wolfi)", [stage.base.image])
}

# Package managers must not exist in the runtime image layers
deny[msg] {
  is_dockerfile
  final_stage(stage)
  uses_package_manager(stage)
  msg := "runtime stage must not invoke package managers"
}

# Builder stages must also use approved builder bases
deny[msg] {
  is_dockerfile
  stage := builder_stages[_]
  builder_base_disallowed(stage.base.image)
  msg := sprintf("builder base %s is not approved", [stage.base.image])
}

############################################
# Helm/Kubernetes policies
############################################

is_k8s_resource(resource) {
  resource.kind
  resource.metadata
}

pod_containers(container) {
  resource := input
  is_k8s_resource(resource)
  resource.kind == "Deployment"
  container := resource.spec.template.spec.containers[_]
}

pod_security(resource) {
  resource := input
  is_k8s_resource(resource)
  resource.kind == "Deployment"
}

deny[msg] {
  pod_containers(container)
  not container.securityContext.readOnlyRootFilesystem
  msg := "containers must use readOnlyRootFilesystem"
}

deny[msg] {
  pod_containers(container)
  not container.securityContext.capabilities.drop
  msg := "capabilities must drop ALL"
}

deny[msg] {
  pod_containers(container)
  container.securityContext.capabilities.drop
  not contains(container.securityContext.capabilities.drop, "ALL")
  msg := "capabilities must explicitly drop ALL"
}

deny[msg] {
  pod_containers(container)
  not container.securityContext.allowPrivilegeEscalation == false
  msg := "allowPrivilegeEscalation must be false"
}

deny[msg] {
  pod_security(resource)
  not resource.spec.template.spec.securityContext.runAsNonRoot
  msg := "runAsNonRoot required at pod securityContext"
}

deny[msg] {
  pod_security(resource)
  not resource.spec.template.spec.securityContext.seccompProfile
  msg := "seccompProfile must be set to RuntimeDefault"
}


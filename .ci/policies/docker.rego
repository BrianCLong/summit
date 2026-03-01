package policy.container

import future.keywords
import future.keywords.in
import future.keywords.contains

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

final_stage(s) {
  is_dockerfile
  count(input.stages) > 0
  s = input.stages[count(input.stages)-1]
}

runtime_base_disallowed(base) {
  not approved_runtime_bases[base]
}

builder_base_disallowed(base) {
  not approved_builder_bases[base]
}

has_user_instruction(stage) {
  some inst in stage.instructions
  lower(inst.name) == "user"
}

uses_package_manager(stage) {
  some inst in stage.instructions
  lower(inst.name) == "run"
  pm := lower(inst.cmd)
  _is_pkg_manager(pm)
}

_is_pkg_manager(pm) {
  contains(pm, "apt-get")
}
_is_pkg_manager(pm) {
  contains(pm, "yum")
}
_is_pkg_manager(pm) {
  contains(pm, "dnf")
}
_is_pkg_manager(pm) {
  contains(pm, "apk add")
}

builder_stages[stage] {
  stage := input.stages[_]
  lower(stage.name) == "build"
}

# Require a non-root user in the final stage
deny["runtime image must set non-root USER"] {
  is_dockerfile
  count(input.stages) > 0
  fs := input.stages[count(input.stages)-1]
  not has_user_instruction(fs)
}

# Runtime base must be in the approved allowlist
deny[msg] {
  is_dockerfile
  count(input.stages) > 0
  fs := input.stages[count(input.stages)-1]
  runtime_base_disallowed(fs.base.image)
  msg := sprintf("runtime base %s is not approved (use distroless/wolfi)", [fs.base.image])
}

# Package managers must not exist in the runtime image layers
deny["runtime stage must not invoke package managers"] {
  is_dockerfile
  count(input.stages) > 0
  fs := input.stages[count(input.stages)-1]
  uses_package_manager(fs)
}

# Builder stages must also use approved builder bases
deny[msg] {
  is_dockerfile
  bs := builder_stages[_]
  builder_base_disallowed(bs.base.image)
  msg := sprintf("builder base %s is not approved", [bs.base.image])
}

############################################
# Helm/Kubernetes policies
############################################

_is_deployment {
  input.kind
  input.metadata
  input.kind == "Deployment"
}

deny["containers must use readOnlyRootFilesystem"] {
  _is_deployment
  ct := input.spec.template.spec.containers[_]
  not ct.securityContext.readOnlyRootFilesystem
}

deny["capabilities must drop ALL"] {
  _is_deployment
  ct := input.spec.template.spec.containers[_]
  not ct.securityContext.capabilities.drop
}

deny["capabilities must explicitly drop ALL"] {
  _is_deployment
  ct := input.spec.template.spec.containers[_]
  ct.securityContext.capabilities.drop
  not contains(ct.securityContext.capabilities.drop, "ALL")
}

deny["allowPrivilegeEscalation must be false"] {
  _is_deployment
  ct := input.spec.template.spec.containers[_]
  not ct.securityContext.allowPrivilegeEscalation == false
}

deny["runAsNonRoot required at pod securityContext"] {
  _is_deployment
  not input.spec.template.spec.securityContext.runAsNonRoot
}

deny["seccompProfile must be set to RuntimeDefault"] {
  _is_deployment
  not input.spec.template.spec.securityContext.seccompProfile
}


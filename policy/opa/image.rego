package kubernetes.admission

deny[msg] {
  input.request.kind.kind == "Pod"
  image := input.request.object.spec.containers[_].image
  not startswith(image, "ghcr.io/")
  msg := sprintf("Image '%v' comes from an untrusted registry", [image])
}

deny[msg] {
    input.request.kind.kind == "Pod"
    some i
    image := input.request.object.spec.containers[i].image
    # Placeholder for signature verification logic or annotation check
    not input.request.object.metadata.labels["verified"]
    msg := sprintf("Image '%v' must be verified (label verified=true required)", [image])
}

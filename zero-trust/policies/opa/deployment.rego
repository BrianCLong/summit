import future.keywords
package docker.policy

# Deny if the MAINTAINER label is missing from the image configuration.
deny[msg] {
    not input.Config.Labels["MAINTAINER"]
    msg := "Image configuration must include a MAINTAINER label."
}

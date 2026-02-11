import future.keywords.in
import future.keywords.if
package dockerfile

import rego.v1

# Dockerfile security policy rules
# Based on CIS Docker Benchmarks and container security best practices

# Deny running as root user
deny contains msg if {
	input.Stage[_].Commands[_].Cmd == "user"
	val := input.Stage[_].Commands[_].Value[0]
	val == "root"
	msg := "Container should not run as root user"
}

# Require explicit USER instruction
deny contains msg if {
	not has_user_instruction
	msg := "Dockerfile must specify a non-root USER instruction"
}

has_user_instruction if {
	input.Stage[_].Commands[_].Cmd == "user"
	val := input.Stage[_].Commands[_].Value[0]
	val != "root"
	val != "0"
}

# Deny privileged operations
deny contains msg if {
	input.Stage[_].Commands[_].Cmd == "run"
	contains(input.Stage[_].Commands[_].Value[0], "sudo")
	msg := "Avoid using sudo in Dockerfiles"
}

# Require HEALTHCHECK instruction
warn contains msg if {
	not has_healthcheck
	msg := "Consider adding a HEALTHCHECK instruction"
}

has_healthcheck if {
	input.Stage[_].Commands[_].Cmd == "healthcheck"
}

# Deny using latest tag for base images
deny contains msg if {
	input.Stage[_].Commands[_].Cmd == "from"
	val := input.Stage[_].Commands[_].Value[0]
	endswith(val, ":latest")
	msg := "Base images should use specific version tags, not :latest"
}

# Deny ADD when COPY should be used
warn contains msg if {
	some stage in input.Stage
	some cmd in stage.Commands
	cmd.Cmd == "add"
	not contains(cmd.Value[0], "http")
	not contains(cmd.Value[0], "ftp")
	msg := "Use COPY instead of ADD for local files"
}

# Require specific base image sources
deny contains msg if {
	input.Stage[_].Commands[_].Cmd == "from"
	val := input.Stage[_].Commands[_].Value[0]
	not starts_with_allowed_registry(val)
	msg := sprintf("Base image must use approved registry. Found: %s", [val])
}

starts_with_allowed_registry(image) if {
	allowed_registries := [
		"ghcr.io",
		"docker.io",
		"registry.access.redhat.com",
		"gcr.io",
		"mcr.microsoft.com",
		"public.ecr.aws"
	]
	some registry in allowed_registries
	startswith(image, registry)
}

# Allow official library images without registry prefix
starts_with_allowed_registry(image) if {
	official_images := [
		"node:",
		"python:",
		"golang:",
		"alpine:",
		"ubuntu:",
		"debian:",
		"nginx:",
		"redis:",
		"postgres:",
		"mysql:"
	]
	some official in official_images
	startswith(image, official)
}

# Security: Avoid installing unnecessary packages
deny contains msg if {
	input.Stage[_].Commands[_].Cmd == "run"
	val := input.Stage[_].Commands[_].Value[0]
	package_managers := ["apt-get", "yum", "apk", "zypper"]
	some pm in package_managers
	contains(val, pm)
	contains(val, "install")
	not contains(val, "--no-install-recommends")
	not contains(val, "--no-cache")
	msg := sprintf("Use %s with --no-install-recommends or --no-cache flag", [pm])
}

# Require cleanup after package installation
warn contains msg if {
	input.Stage[_].Commands[_].Cmd == "run"
	val := input.Stage[_].Commands[_].Value[0]
	contains(val, "apt-get install")
	not contains(val, "rm -rf /var/lib/apt/lists/*")
	msg := "Clean up apt cache after installation: rm -rf /var/lib/apt/lists/*"
}

# Secrets and sensitive data checks
deny contains msg if {
	input.Stage[_].Commands[_].Cmd == "env"
	val := input.Stage[_].Commands[_].Value[0]
	sensitive_keys := ["password", "secret", "key", "token", "api_key"]
	some key in sensitive_keys
	contains(lower(val), key)
	msg := sprintf("Avoid hardcoding sensitive data in ENV: %s", [val])
}

# Port exposure validation
deny contains msg if {
	input.Stage[_].Commands[_].Cmd == "expose"
	val := to_number(input.Stage[_].Commands[_].Value[0])
	val < 1024
	msg := sprintf("Avoid exposing privileged ports (< 1024): %s", [input.Stage[_].Commands[_].Value[0]])
}

# Multi-stage build best practices
warn contains msg if {
	count(input.Stage) == 1
	msg := "Consider using multi-stage builds for smaller final images"
}

# Label requirements for compliance
warn contains msg if {
	not has_required_labels
	msg := "Missing required labels: maintainer, version, description"
}

has_required_labels if {
	required := {"maintainer", "version", "description"}
	labels := {label |
		input.Stage[_].Commands[_].Cmd == "label"
		some kv in input.Stage[_].Commands[_].Value
		[key, _] := split(kv, "=")
		label := lower(key)
	}
	required == (required & labels)
}
package docker.security

import rego.v1

# Deny images using latest tag in production
deny contains msg if {
  input.services[service_name].image
  contains(input.services[service_name].image, ":latest")
  msg := sprintf("Service '%s' uses ':latest' tag, should use specific version", [service_name])
}

# Require specific image digests for critical services
deny contains msg if {
  critical_services := {"opa", "mcp-graphops", "mcp-files"}
  critical_services[service_name]
  input.services[service_name]
  image := input.services[service_name].image
  not contains(image, "@sha256:")
  msg := sprintf("Critical service '%s' must use image digest, not tag", [service_name])
}

# Require health checks for all services
warn contains msg if {
  input.services[service_name]
  not input.services[service_name].healthcheck
  not input.services[service_name].depends_on
  msg := sprintf("Service '%s' should have a health check configured", [service_name])
}

# Require resource limits for production services
warn contains msg if {
  input.services[service_name]
  not input.services[service_name].deploy.resources.limits
  production_services := {"server", "opa", "mcp-graphops", "mcp-files"}
  production_services[service_name]
  msg := sprintf("Production service '%s' should have resource limits", [service_name])
}

# Deny root user in containers
deny contains msg if {
  input.services[service_name].user == "0"
  msg := sprintf("Service '%s' runs as root, should use non-root user", [service_name])
}

# Deny privileged containers
deny contains msg if {
  input.services[service_name].privileged == true
  msg := sprintf("Service '%s' runs in privileged mode, this is not allowed", [service_name])
}

# Require security context for critical services
warn contains msg if {
  critical_services := {"opa", "server"}
  critical_services[service_name]
  input.services[service_name]
  not input.services[service_name].cap_drop
  msg := sprintf("Critical service '%s' should drop capabilities with cap_drop", [service_name])
}

# Deny binding to all interfaces in production
warn contains msg if {
  input.services[service_name].ports[_]
  port_config := input.services[service_name].ports[_]
  startswith(port_config, "0.0.0.0:")
  msg := sprintf("Service '%s' binds to all interfaces (0.0.0.0), consider restricting", [service_name])
}

# Require environment variable validation
warn contains msg if {
  input.services[service_name].environment
  env_list := input.services[service_name].environment
  sensitive_vars := {"password", "secret", "key", "token"}
  env_var := env_list[_]
  contains(lower(env_var), sensitive_vars[_])
  not contains(env_var, "${")  # Not using variable substitution
  msg := sprintf("Service '%s' may have hardcoded sensitive values in environment", [service_name])
}

# Require restart policies for production services
warn contains msg if {
  production_services := {"server", "opa", "mcp-graphops", "mcp-files", "neo4j", "postgres", "redis"}
  production_services[service_name]
  input.services[service_name]
  not input.services[service_name].restart
  msg := sprintf("Production service '%s' should have restart policy configured", [service_name])
}

# Validate volume mount security
warn contains msg if {
  input.services[service_name].volumes[_]
  volume := input.services[service_name].volumes[_]
  contains(volume, "/var/run/docker.sock")
  msg := sprintf("Service '%s' mounts Docker socket, verify this is necessary", [service_name])
}

# Require networks for service isolation
warn contains msg if {
  input.services[service_name]
  not input.services[service_name].networks
  count(input.services) > 1
  msg := sprintf("Service '%s' should be on a named network for isolation", [service_name])
}

# Validate logging configuration
warn contains msg if {
  production_services := {"server", "opa"}
  production_services[service_name]
  input.services[service_name]
  not input.services[service_name].logging
  msg := sprintf("Production service '%s' should have logging configuration", [service_name])
}

# Check for development configurations in production
deny contains msg if {
  input.services[service_name].environment
  env_list := input.services[service_name].environment
  dev_indicators := ["DEBUG=", "NODE_ENV=development", "RAILS_ENV=development"]
  env_var := env_list[_]
  contains(env_var, dev_indicators[_])
  msg := sprintf("Service '%s' has development configuration in production", [service_name])
}

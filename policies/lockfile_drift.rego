package summit

# Deny if any component in SBOM fails validity check
deny[msg] {
  # Iterate over components
  c := input.sbom.components[_]
  not component_is_valid(c, input.lockfile, input.exceptions)
  msg := sprintf("lockfile drift detected: %s@%s", [c.name, c.version])
}

# Validity Check: Allow if exception applies
component_is_valid(c, lockfile, exceptions) {
  exception_applies(c, exceptions)
}

# Validity Check: Allow if matches lockfile version
component_is_valid(c, lockfile, exceptions) {
  # Normalize name to match lockfile format
  name := lower(c.name)
  version := c.version

  # Ensure dependency exists and contains the version
  lockfile.dependencies[name][_] == version
}

# Exceptions: Exact Match
exception_applies(c, exceptions) {
  some exact
  exact := exceptions.allow_exact[_]
  exact == sprintf("%s@%s", [lower(c.name), c.version])
}

# Exceptions: PURL Prefix
exception_applies(c, exceptions) {
  some pref
  pref := exceptions.allow_purl_prefix[_]
  startswith(c.purl, pref)
}

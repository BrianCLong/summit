export function validateVersioningChange({ previous, next }) {
  const result = { breaking: false, messages: [] };
  if (!next.version) {
    result.breaking = true;
    result.messages.push("Missing new version identifier");
  }
  if (previous.version === next.version && hasBreakingSchemaChange(previous, next)) {
    result.breaking = true;
    result.messages.push("Breaking change requires version bump");
  }
  if (next.deprecation && !next.deprecation.sunset) {
    result.breaking = true;
    result.messages.push("Deprecation must include sunset");
  }
  return result;
}

function hasBreakingSchemaChange(previous, next) {
  const prevPaths = Object.keys(previous.paths ?? {});
  const nextPaths = Object.keys(next.paths ?? {});
  for (const path of prevPaths) {
    if (!nextPaths.includes(path)) return true;
    const prevMethods = Object.keys(previous.paths[path]);
    const nextMethods = Object.keys(next.paths[path] ?? {});
    for (const method of prevMethods) {
      if (!nextMethods.includes(method)) return true;
    }
  }
  return false;
}

export function generateChangelogEntry({ previous, next }) {
  const breaking = hasBreakingSchemaChange(previous, next);
  return {
    version: next.version,
    breaking,
    added: Object.keys(next.paths ?? {}).filter((p) => !(previous.paths ?? {})[p]),
    removed: Object.keys(previous.paths ?? {}).filter((p) => !(next.paths ?? {})[p]),
  };
}

# Data path tagging policy used by the ABAC validation workflow.
# Ensures schemas and configs that define data paths carry consistent tags.

package summit.datapaths

valid_systems := {"maestro", "intelgraph", "companyos"}

valid_system(system) {
  valid_systems[system]
}

has_tag_with_prefix(tags, prefix) {
  t := tags[_]
  startswith(t, prefix)
}

system_tag_matches(entry) {
  entry.tags[_] == sprintf("system:%s", [entry.system])
}

violations[msg] {
  entry := input.paths[_]
  count(entry.tags) == 0
  msg := sprintf("%s has no tags", [entry.path])
}

violations[msg] {
  entry := input.paths[_]
  not valid_system(entry.system)
  msg := sprintf("%s uses unsupported system %s", [entry.path, entry.system])
}

violations[msg] {
  entry := input.paths[_]
  not system_tag_matches(entry)
  msg := sprintf("%s is missing system:%s tag", [entry.path, entry.system])
}

violations[msg] {
  entry := input.paths[_]
  not has_tag_with_prefix(entry.tags, "data-path:")
  msg := sprintf("%s is missing data-path tag", [entry.path])
}

violations[msg] {
  entry := input.paths[_]
  not has_tag_with_prefix(entry.tags, "classification:")
  msg := sprintf("%s is missing classification tag", [entry.path])
}

all_valid {
  count(violations) == 0
}

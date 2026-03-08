package github.actions.security

deny[msg] {
  some file, step
  endswith(file, ".yml")
  input.workflows[file].jobs[_].steps[step].uses != ""
  not startswith(input.workflows[file].jobs[_].steps[step].uses, "docker://")
  not contains(input.workflows[file].jobs[_].steps[step].uses, "@")
  msg := sprintf("Unpinned action in %s: %s (missing @<commitSHA>)", [file, input.workflows[file].jobs[_].steps[step].uses])
}

deny[msg] {
  some file, step
  uses := input.workflows[file].jobs[_].steps[step].uses
  contains(uses, "@")
  not regex.match("@[0-9a-f]{40}$", uses)  # require full commit SHA
  msg := sprintf("Action must be pinned to commit SHA: %s", [uses])
}

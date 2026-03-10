package summit

import rego.v1

# Block mutable major tags like @v1, @v2, or unpinned "uses: owner/repo@ref" where ref matches v\d+$
deny contains msg if {
  some i
  uses := input.workflows[i].uses
  regex.match("@v\\d+$", uses)
  # Exception for attest-build-provenance which is currently v1 and used in our gate
  not startswith(uses, "actions/attest-build-provenance")
  msg := sprintf("workflow %s uses mutable tag: %s", [input.workflows[i].name, uses])
}

# Also block missing SHA pin (allow @v4 or full 40-char SHA). Tweak as you prefer.
deny contains msg if {
  some i
  uses := input.workflows[i].uses
  startswith(uses, "actions/")                  # marketplace or GH official
  not regex.match("@v4(\\.|$)", uses)              # require v4+ or SHA
  not regex.match("@[0-9a-f]{40}$", uses)          # SHA pin
  # Exception for attest-build-provenance
  not startswith(uses, "actions/attest-build-provenance")
  msg := sprintf("workflow %s is not pinned to v4+ or SHA: %s", [input.workflows[i].name, uses])
}

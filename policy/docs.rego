package docs

# Fail pages lacking required sections
violation[msg] {
  input.path.endswith(".md")
  not input.content_matches_see_also
  msg := sprintf("%s missing 'See also' section", [input.path])
}

# Public pages must have index!=false (i.e., indexable)
violation[msg] {
  input.frontmatter.visibility == "public"
  input.frontmatter.index == false
  msg := sprintf("%s is public but marked noindex", [input.path])
}

# Partner/internal pages must have owner != 'unknown'
violation[msg] {
  input.frontmatter.visibility != "public"
  input.frontmatter.owner == "unknown"
  msg := sprintf("%s lacks owner", [input.path])
}
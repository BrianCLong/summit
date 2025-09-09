package docs.content

# Example policy: All docs must have a title
deny[msg] {
  not input.frontmatter.title
  msg := "Document must have a title"
}

# Example policy: All docs must have an owner
deny[msg] {
  not input.frontmatter.owner
  msg := "Document must have an owner"
}
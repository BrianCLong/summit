package images
allow if {
  startswith(input.image, "gcr.io/distroless/")
} else if {
  startswith(input.image, "cgr.dev/chainguard/")
}

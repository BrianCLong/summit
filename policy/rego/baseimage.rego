package images
allow {
  startswith(input.image, "gcr.io/distroless/")
} else {
  startswith(input.image, "cgr.dev/chainguard/")
}
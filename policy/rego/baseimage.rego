import future.keywords.in
import future.keywords.if
package images
allow if {
  startswith(input.image, "gcr.io/distroless/")
} else if {
  startswith(input.image, "cgr.dev/chainguard/")
}

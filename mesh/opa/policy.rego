import future.keywords
package envoy.authz

allow {
  input.attributes.request.http.headers["x-tenant-id"] == input.attributes.context.extensions.tenant
  input.parsed_body != null
}
import future.keywords
package residency
allow_write if { input.tenant.region == input.request.region }

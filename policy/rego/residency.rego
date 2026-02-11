import future.keywords.in
import future.keywords.if
package residency
allow_write if { input.tenant.region == input.request.region }

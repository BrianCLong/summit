package residency
import future.keywords.if
allow_write if { input.tenant.region == input.request.region }

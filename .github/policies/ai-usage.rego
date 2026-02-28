package summit.ai.governance

# Import immutable vendor redlines
import data.vendor.redlines

# Deny by default posture
default allow := false

# 1. Reject if intent hits any global vendor redlines
deny_redline[msg] {
    redlines[_] == input.intent
    msg := sprintf("POLICY_VIOLATION_REDLINE: Intent '%v' violates immutable vendor safety redlines.", [input.intent])
}

# 2. Allow only if intent is explicitly whitelisted for the tenant's profile AND not a redline
allow {
    count(deny_redline) == 0
    profile := input.profile
    allowed_intents := data.profiles[profile].allowed_intents
    allowed_intents[_] == input.intent
}

# 3. Deny if profile lacks permission (implicit deny fallthrough, explicit message)
deny_profile[msg] {
    count(deny_redline) == 0
    not allow
    msg := sprintf("POLICY_VIOLATION_PROFILE: Intent '%v' is not permitted under tenant profile '%v'.", [input.intent, input.profile])
}

# Audit Context Emission
audit_log := {
    "requestId": input.requestId,
    "profile": input.profile,
    "intent": input.intent,
    "action": action_result,
}

action_result = "ALLOWED" { allow }
action_result = "REDLINE_VIOLATION" { count(deny_redline) > 0 }
action_result = "DENIED" { not allow; count(deny_redline) == 0 }

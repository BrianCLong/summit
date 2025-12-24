package ethics.interaction

import future.keywords.if
import future.keywords.in

# Default to allowing interactions, but denying specific unethical ones
# In a real system, we might default to deny.
default deny = set()

# Deny private regulator interactions
deny contains "private_regulator_interaction" if {
    input.interaction.type == "regulator"
    input.interaction.channel == "private"
}

# Deny quid-pro-quo offers
deny contains "quid_pro_quo" if {
    input.interaction.offer == "favorable_treatment"
}

# Deny if any violation is found
violation if {
    count(deny) > 0
}

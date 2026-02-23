package truth_defense

import future.keywords.in

# Default deny
default allow = false

# Rules...
quarantined_low_integrity := 0
low_integrity_total := 0

containment_score := score {
    low_integrity_total > 0
    score := quarantined_low_integrity / low_integrity_total
} else := 1.0

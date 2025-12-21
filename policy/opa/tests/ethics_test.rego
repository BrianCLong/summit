package ethics.interaction_test

import data.ethics.interaction

test_deny_improper_mention {
    interaction.deny with input as ["src/secret_lobbying.ts:5: // call the regulator for a favor"]
}

test_allow_proper_mention {
    not interaction.deny with input as ["governance/regulatory/log.md:10: Met with regulator for standard audit"]
}

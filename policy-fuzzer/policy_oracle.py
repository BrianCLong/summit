"""Rule-based oracle for policy compliance checking."""

from datetime import timedelta

from attack_grammars import ATTACK_GRAMMARS
from governance_layers import _resolve_field
from policy_parser import generate_policy_from_definition  # Import the new function


def _apply_timezone_shift_to_datetime(dt, timezone_shift_str):
    if timezone_shift_str:
        sign = timezone_shift_str[0]
        hours = int(timezone_shift_str[1:3])
        minutes = int(timezone_shift_str[4:6])
        offset = timedelta(hours=hours, minutes=minutes)
        if sign == "-":
            return dt + offset
        else:
            return dt - offset
    return dt


class PolicyOracle:
    def __init__(self, policy_definition):
        self.policy_evaluator = generate_policy_from_definition(policy_definition)
        self.properties = self._define_properties()

    def _define_properties(self):
        """Defines high-level properties that compliant policy-query pairs should satisfy."""
        properties = []

        # Property 1: If a policy explicitly denies access, it should never be compliant.
        properties.append(
            {
                "name": "explicit_deny",
                "check": lambda p, q, is_compliant: p.get("effect") != "deny" or not is_compliant,
            }
        )

        # Property 2: If a policy requires consent and query does not provide it, it should not be compliant.
        properties.append(
            {
                "name": "consent_required",
                "check": lambda p, q, is_compliant: not (
                    p.get("consent") == "user_data"
                    and _resolve_field(q, "data") != "user_data"
                    and _resolve_field(q, "data")
                    not in ATTACK_GRAMMARS["synonym_dodges"].get("user_data", [])
                )
                or not is_compliant,
            }
        )

        return properties

    def determine_expected_compliance(self, policy, query):
        """Determines the expected compliance of a policy-query pair based on the policy evaluator and properties."""
        # First, determine compliance based on the policy evaluator
        is_compliant_by_evaluator = self.policy_evaluator(policy, query)

        # Then, check if any properties are violated
        for prop in self.properties:
            if not prop["check"](policy, query, is_compliant_by_evaluator):
                return False  # Property violation means non-compliant

        return is_compliant_by_evaluator  # Return the result from the evaluator if no property is violated

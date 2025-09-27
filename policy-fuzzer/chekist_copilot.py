"""Mecha-Chekist Copilot for aggressive policy fuzzing."""

import random
from attack_grammars import ATTACK_GRAMMARS
from policy_generator import POLICY_POOL, LOADED_POLICY_TEMPLATES, _generate_random_condition, _randomize_conditions, _extract_policy_data_from_conditions
from copy import deepcopy
import yaml

class ChekistCopilot:
    def __init__(self):
        print("Mecha-Chekist Copilot activated. Initiating aggressive policy fuzzing protocols.")

    def get_aggressive_policy(self):
        """Generates an aggressively mutated policy targeting critical vulnerabilities."""
        # Prioritize policies with 'deny' effects or sensitive data
        if POLICY_POOL and random.random() < 0.7: # High chance to mutate an existing policy
            policy_definition = random.choice(POLICY_POOL)
            mutated_policy = self._aggressive_mutate_policy(policy_definition)
        else:
            # Generate a new policy, but bias towards sensitive conditions
            policy_definition = self._generate_biased_policy()
            mutated_policy = self._aggressive_mutate_policy(policy_definition) # Still apply aggressive mutations

        # Ensure the policy is parsed and extracted correctly for the oracle
        parsed_definition = parse_policy_definition(yaml.dump(mutated_policy))
        if parsed_definition:
            policy_data = {}
            for rule in parsed_definition.get("rules", []):
                policy_data.update(_extract_policy_data_from_conditions(rule.get("condition", {})))
                if "effect" in rule:
                    policy_data["effect"] = rule["effect"]
            return policy_data
        return {} # Return an empty policy if parsing fails

    def _aggressive_mutate_policy(self, policy_definition):
        """Applies aggressive mutations to a policy definition."""
        mutated_policy = deepcopy(policy_definition)
        rules = mutated_policy.get("rules", [])

        # Always ensure at least one rule exists for mutation
        if not rules:
            rules.append({"effect": random.choice(["allow", "deny"]), "condition": _generate_random_condition()})
            mutated_policy["rules"] = rules

        # Apply multiple, more aggressive mutations
        for _ in range(random.randint(1, 3)): # Apply 1 to 3 aggressive mutations
            mutation_type = random.choice(["change_effect", "add_rule", "remove_rule", "modify_condition", "introduce_conflict"])

            if mutation_type == "change_effect":
                if rules:
                    rule_to_mutate = random.choice(rules)
                    rule_to_mutate["effect"] = "deny" if rule_to_mutate.get("effect", "allow") == "allow" else "allow"
            elif mutation_type == "add_rule":
                rules.append({"effect": random.choice(["allow", "deny"]), "condition": _generate_random_condition()})
            elif mutation_type == "remove_rule":
                if len(rules) > 1:
                    rules.remove(random.choice(rules))
            elif mutation_type == "modify_condition":
                if rules:
                    rule_to_mutate = random.choice(rules)
                    if "condition" in rule_to_mutate and rule_to_mutate["condition"]:
                        # Simplified: just replace a random simple condition
                        if isinstance(rule_to_mutate["condition"], dict):
                            key_to_modify = random.choice(list(rule_to_mutate["condition"].keys()))
                            if key_to_modify not in ["AND", "OR", "NOT"]:
                                rule_to_mutate["condition"][key_to_modify] = _generate_random_condition()[key_to_modify]
            elif mutation_type == "introduce_conflict":
                # Add a rule that directly conflicts with an existing rule
                if rules:
                    existing_rule = random.choice(rules)
                    conflicting_effect = "allow" if existing_rule.get("effect", "allow") == "deny" else "deny"
                    conflicting_condition = deepcopy(existing_rule.get("condition", {}))
                    rules.append({"effect": conflicting_effect, "condition": conflicting_condition})

        mutated_policy["rules"] = rules
        return mutated_policy

    def _generate_biased_policy(self):
        """Generates a new policy biased towards sensitive conditions."""
        # Select a template, then bias its conditions
        if not LOADED_POLICY_TEMPLATES:
            return {"rules": []}

        template = random.choice(LOADED_POLICY_TEMPLATES)
        biased_policy = deepcopy(template)

        for rule in biased_policy.get("rules", []):
            if "condition" in rule:
                rule["condition"] = self._bias_conditions(rule["condition"])
        return biased_policy

    def _bias_conditions(self, conditions):
        """Recursively biases conditions towards sensitive values."""
        if isinstance(conditions, dict):
            new_conditions = {}
            for key, value in conditions.items():
                if key in ["AND", "OR", "NOT"]:
                    new_conditions[key] = [self._bias_conditions(v) for v in value]
                elif key == "data":
                    new_conditions[key] = "sensitive_data" # Bias towards sensitive data
                elif key == "user_role":
                    new_conditions[key] = "admin" # Bias towards admin role
                else:
                    new_conditions[key] = value
            return new_conditions
        return conditions

    def get_aggressive_query(self, args):
        """Generates an aggressively mutated query targeting critical vulnerabilities."""
        query = {
            "data": random.choice(ATTACK_GRAMMARS["synonym_dodges"].get("user_data", ["user_data"])), # Bias towards user data and synonyms
            "location": random.choice(ATTACK_GRAMMARS["regex_dodges"].get("geo", ["US"])), # Bias towards geo dodges
            "license": random.choice(ATTACK_GRAMMARS["synonym_dodges"].get("license_A", ["license_A"])),
            "retention": random.choice(ATTACK_GRAMMARS["regex_dodges"].get("retention_period", ["30d"])),
            "access_date": (datetime.now() + timedelta(days=random.randint(-365, 365))).isoformat(),
            "user_role": random.choice(["admin", "guest"]), # Bias towards admin or guest
            "network_condition": random.choice(["unsecure", "vpn"]), # Bias towards less secure networks
            "purpose": random.choice(["investigation", "marketing"])
        }

        # Apply all attack grammars with higher probability
        if random.random() < 0.8: # 80% chance to apply synonym dodges
            if query["data"] in ATTACK_GRAMMARS["synonym_dodges"]:
                query["data"] = random.choice(ATTACK_GRAMMARS["synonym_dodges"][query["data"]])
            if query["license"] is not None and query["license"] in ATTACK_GRAMMARS["synonym_dodges"]:
                query["license"] = random.choice(ATTACK_GRAMMARS["synonym_dodges"][query["license"]])

        if random.random() < 0.8: # 80% chance to apply field aliasing
            aliased_canonical_field = random.choice(list(ATTACK_GRAMMARS["field_aliasing"].keys()))
            alias = random.choice(ATTACK_GRAMMARS["field_aliasing"][aliased_canonical_field])
            if aliased_canonical_field in query:
                query[alias] = query.pop(aliased_canonical_field)

        if random.random() < 0.8: # 80% chance to apply regex dodges
            resolved_retention = _resolve_field(query, "retention")
            if resolved_retention is not None and "retention_period" in ATTACK_GRAMMARS["regex_dodges"]:
                updated_retention_value = random.choice(ATTACK_GRAMMARS["regex_dodges"]["retention_period"])
                if "retention" in query:
                    query["retention"] = updated_retention_value
                else:
                    for canonical_field, aliases in ATTACK_GRAMMARS["field_aliasing"].items():
                        if canonical_field == "retention":
                            for alias_key in aliases:
                                if alias_key in query:
                                    query[alias_key] = updated_retention_value
                                    break

        if random.random() < 0.8 and ATTACK_GRAMMARS["time_window_boundary_hops"]:
            hop = random.choice(ATTACK_GRAMMARS["time_window_boundary_hops"])
            current_date = datetime.fromisoformat(query["access_date"])
            if hop["unit"] == "day":
                current_date += timedelta(days=hop["offset"])
            elif hop["unit"] == "hour":
                current_date += timedelta(hours=hop["offset"])
            elif hop["unit"] == "week":
                current_date += timedelta(weeks=hop["offset"])
            elif hop["unit"] == "month":
                current_date += timedelta(days=hop["offset"] * 30)
            query["access_date"] = current_date.isoformat()
            if "timezone_shift" in hop:
                query["timezone_shift"] = hop["timezone_shift"]

        if random.random() < 0.8 and ATTACK_GRAMMARS["data_type_mismatches"]:
            field_to_mismatch = random.choice(list(ATTACK_GRAMMARS["data_type_mismatches"].keys()))
            if field_to_mismatch in query:
                query[field_to_mismatch] = random.choice(ATTACK_GRAMMARS["data_type_mismatches"][field_to_mismatch])

        return query

"""Metamorphic testing for policy-fuzzer."""

import random
from copy import deepcopy
from datetime import datetime, timedelta

from attack_grammars import ATTACK_GRAMMARS


class MetamorphicTester:
    def __init__(self, oracle):
        self.oracle = oracle
        self.relations = self._define_metamorphic_relations()

    def _define_metamorphic_relations(self):
        """Defines metamorphic relations for policy-query pairs."""
        relations = []

        # Relation 1: Time Window - Shift within window
        relations.append(
            {
                "name": "time_window_shift_within",
                "transform": lambda p, q: self._shift_time_within_window(p, q),
                "check": lambda original_compliant, transformed_compliant: original_compliant
                == transformed_compliant,
            }
        )

        # Relation 2: Time Window - Shift outside window
        relations.append(
            {
                "name": "time_window_shift_outside",
                "transform": lambda p, q: self._shift_time_outside_window(p, q),
                "check": lambda original_compliant, transformed_compliant: (
                    not transformed_compliant if original_compliant else True
                ),
            }
        )

        # Relation 3: Geo - Synonym location
        relations.append(
            {
                "name": "geo_synonym",
                "transform": lambda p, q: self._synonym_location(p, q),
                "check": lambda original_compliant, transformed_compliant: original_compliant
                == transformed_compliant,
            }
        )

        # Relation 4: Consent - Synonym data type
        relations.append(
            {
                "name": "consent_synonym",
                "transform": lambda p, q: self._synonym_data_type(p, q),
                "check": lambda original_compliant, transformed_compliant: original_compliant
                == transformed_compliant,
            }
        )

        # Relation 5: Data Transformation - Anonymize data
        relations.append(
            {
                "name": "data_anonymization",
                "transform": lambda p, q: self._anonymize_data(p, q),
                "check": lambda original_compliant, transformed_compliant: (
                    transformed_compliant if original_compliant else True
                ),  # Anonymized data should be more compliant
            }
        )

        # Relation 6: Policy Transformation - Toggle effect
        relations.append(
            {
                "name": "policy_toggle_effect",
                "transform": lambda p, q: self._toggle_policy_effect(p, q),
                "check": lambda original_compliant, transformed_compliant: original_compliant
                != transformed_compliant,  # Toggling effect should flip compliance
            }
        )

        # Relation 7: Time Window - Shift by week
        relations.append(
            {
                "name": "time_window_shift_week",
                "transform": lambda p, q: self._shift_time_by_unit(
                    p, q, "week", random.choice([-1, 1])
                ),
                "check": lambda original_compliant, transformed_compliant: original_compliant
                == transformed_compliant,  # Assuming week shift within window should maintain compliance
            }
        )

        # Relation 8: Time Window - Fuzzy date comparison
        relations.append(
            {
                "name": "time_window_fuzzy_date",
                "transform": lambda p, q: self._fuzzy_date_comparison(p, q),
                "check": lambda original_compliant, transformed_compliant: original_compliant
                == transformed_compliant,  # Fuzzy date should ideally maintain compliance if within reasonable bounds
            }
        )

        # Relation 9: Geo - Proximity shift
        relations.append(
            {
                "name": "geo_proximity_shift",
                "transform": lambda p, q: self._geo_proximity_shift(p, q),
                "check": lambda original_compliant, transformed_compliant: original_compliant
                == transformed_compliant,  # Proximity shift should ideally maintain compliance if within reasonable bounds
            }
        )

        # Relation 10: Geo - Country code variation
        relations.append(
            {
                "name": "geo_country_code_variation",
                "transform": lambda p, q: self._geo_country_code_variation(p, q),
                "check": lambda original_compliant, transformed_compliant: original_compliant
                == transformed_compliant,  # Country code variation should maintain compliance
            }
        )

        # Relation 11: Consent - Level change
        relations.append(
            {
                "name": "consent_level_change",
                "transform": lambda p, q: self._consent_level_change(p, q),
                "check": lambda original_compliant, transformed_compliant: (
                    not transformed_compliant if original_compliant else True
                ),  # Changing consent level should impact compliance
            }
        )

        # Relation 12: License - Version change
        relations.append(
            {
                "name": "license_version_change",
                "transform": lambda p, q: self._license_version_change(p, q),
                "check": lambda original_compliant, transformed_compliant: (
                    not transformed_compliant if original_compliant else True
                ),  # Changing license version should impact compliance
            }
        )

        # Relation 13: Retention - Period extension
        relations.append(
            {
                "name": "retention_period_extension",
                "transform": lambda p, q: self._retention_period_extension(p, q),
                "check": lambda original_compliant, transformed_compliant: original_compliant
                == transformed_compliant,  # Extending retention should ideally maintain compliance if within policy limits
            }
        )

        # Relation 14: Retention - Period shortening
        relations.append(
            {
                "name": "retention_period_shortening",
                "transform": lambda p, q: self._retention_period_shortening(p, q),
                "check": lambda original_compliant, transformed_compliant: original_compliant
                == transformed_compliant,  # Shortening retention should ideally maintain compliance
            }
        )

        # Relation 15: User Role - Escalation
        relations.append(
            {
                "name": "user_role_escalation",
                "transform": lambda p, q: self._user_role_escalation(p, q),
                "check": lambda original_compliant, transformed_compliant: (
                    transformed_compliant if original_compliant else True
                ),  # Escalating role should ideally maintain or increase compliance
            }
        )

        # Relation 16: Network Condition - Change
        relations.append(
            {
                "name": "network_condition_change",
                "transform": lambda p, q: self._network_condition_change(p, q),
                "check": lambda original_compliant, transformed_compliant: (
                    not transformed_compliant if original_compliant else True
                ),  # Changing network condition might impact compliance
            }
        )

        # Relation 17: Data Classification - Change
        relations.append(
            {
                "name": "data_classification_change",
                "transform": lambda p, q: self._data_classification_change(p, q),
                "check": lambda original_compliant, transformed_compliant: (
                    not transformed_compliant if original_compliant else True
                ),  # Changing data classification should impact compliance
            }
        )

        # Relation 18: Purpose - Change
        relations.append(
            {
                "name": "purpose_change",
                "transform": lambda p, q: self._purpose_change(p, q),
                "check": lambda original_compliant, transformed_compliant: (
                    not transformed_compliant if original_compliant else True
                ),  # Changing purpose should impact compliance
            }
        )

        # Relation 19: Policy - Add new rule
        relations.append(
            {
                "name": "policy_add_rule",
                "transform": lambda p, q: self._add_new_rule(p, q),
                "check": lambda original_compliant, transformed_compliant: original_compliant
                == transformed_compliant,  # Adding a new rule should not change compliance if it doesn't conflict
            }
        )

        # Relation 20: Policy - Remove random rule
        relations.append(
            {
                "name": "policy_remove_rule",
                "transform": lambda p, q: self._remove_random_rule(p, q),
                "check": lambda original_compliant, transformed_compliant: original_compliant
                == transformed_compliant,  # Removing a rule should not change compliance if it wasn't the deciding factor
            }
        )

        # Relation 21: Policy - Modify rule condition
        relations.append(
            {
                "name": "policy_modify_condition",
                "transform": lambda p, q: self._modify_rule_condition(p, q),
                "check": lambda original_compliant, transformed_compliant: original_compliant
                != transformed_compliant,  # Modifying a condition should impact compliance
            }
        )

        return relations

    def _shift_time_within_window(self, policy, query):
        transformed_query = deepcopy(query)
        if "access_date" in transformed_query:
            access_date = datetime.fromisoformat(transformed_query["access_date"])
            # Shift by a small random amount within a day
            shift_hours = random.randint(-6, 6)
            transformed_query["access_date"] = (
                access_date + timedelta(hours=shift_hours)
            ).isoformat()
        return transformed_query

    def _shift_time_outside_window(self, policy, query):
        transformed_query = deepcopy(query)
        if "access_date" in transformed_query:
            access_date = datetime.fromisoformat(transformed_query["access_date"])
            # Shift significantly outside the window (e.g., a year)
            shift_years = random.choice([-1, 1])
            transformed_query["access_date"] = (
                access_date + timedelta(days=365 * shift_years)
            ).isoformat()
        return transformed_query

    def _shift_time_by_unit(self, policy, query, unit, offset):
        transformed_query = deepcopy(query)
        if "access_date" in transformed_query:
            access_date = datetime.fromisoformat(transformed_query["access_date"])
            if unit == "week":
                access_date += timedelta(weeks=offset)
            elif unit == "month":
                access_date += timedelta(days=offset * 30)  # Approximate month
            elif unit == "year":
                access_date += timedelta(days=offset * 365)  # Approximate year
            transformed_query["access_date"] = access_date.isoformat()
        return transformed_query

    def _fuzzy_date_comparison(self, policy, query):
        transformed_query = deepcopy(query)
        if "access_date" in transformed_query:
            access_date = datetime.fromisoformat(transformed_query["access_date"])
            # Introduce a small random offset (e.g., +/- a few minutes)
            fuzzy_minutes = random.randint(-5, 5)
            transformed_query["access_date"] = (
                access_date + timedelta(minutes=fuzzy_minutes)
            ).isoformat()
        return transformed_query

    def _synonym_location(self, policy, query):
        transformed_query = deepcopy(query)
        if "location" in transformed_query and "geo" in ATTACK_GRAMMARS["synonym_dodges"]:
            if transformed_query["location"] in ATTACK_GRAMMARS["synonym_dodges"]["geo"]:
                transformed_query["location"] = random.choice(
                    ATTACK_GRAMMARS["synonym_dodges"]["geo"]
                )
        return transformed_query

    def _geo_proximity_shift(self, policy, query):
        transformed_query = deepcopy(query)
        if "location" in transformed_query:
            current_location = transformed_query["location"]
            # Simplified proximity shift: if US, shift to CA or EU randomly
            if current_location == "US":
                transformed_query["location"] = random.choice(["CA", "EU"])
            elif current_location == "EU":
                transformed_query["location"] = random.choice(["US", "CA"])
            # Add more complex logic for actual geo proximity
        return transformed_query

    def _geo_country_code_variation(self, policy, query):
        transformed_query = deepcopy(query)
        if "location" in transformed_query:
            current_location = transformed_query["location"]
            if current_location == "US":
                transformed_query["location"] = "USA"
            elif current_location == "CA":
                transformed_query["location"] = "CAN"
            # Add more country code variations
        return transformed_query

    def _consent_level_change(self, policy, query):
        transformed_query = deepcopy(query)
        if "consent" in transformed_query:
            current_consent = transformed_query["consent"]
            if current_consent == "user_data":
                transformed_query["consent"] = "marketing"
            elif current_consent == "marketing":
                transformed_query["consent"] = "user_data"
        return transformed_query

    def _license_version_change(self, policy, query):
        transformed_query = deepcopy(query)
        if "license" in transformed_query:
            current_license = transformed_query["license"]
            if current_license == "license_A":
                transformed_query["license"] = "license_A_v2"
            elif current_license == "license_B":
                transformed_query["license"] = "license_B_v2"
        return transformed_query

    def _retention_period_extension(self, policy, query):
        transformed_query = deepcopy(query)
        if "retention" in transformed_query and transformed_query["retention"] is not None:
            current_retention = transformed_query["retention"]
            # Simple extension: if 30d, extend to 90d
            if current_retention == "30d":
                transformed_query["retention"] = "90d"
            elif current_retention == "90d":
                transformed_query["retention"] = "1y"
        return transformed_query

    def _retention_period_shortening(self, policy, query):
        transformed_query = deepcopy(query)
        if "retention" in transformed_query and transformed_query["retention"] is not None:
            current_retention = transformed_query["retention"]
            # Simple shortening: if 90d, shorten to 30d
            if current_retention == "90d":
                transformed_query["retention"] = "30d"
            elif current_retention == "1y":
                transformed_query["retention"] = "90d"
        return transformed_query

    def _user_role_escalation(self, policy, query):
        transformed_query = deepcopy(query)
        if "user_role" in transformed_query:
            current_role = transformed_query["user_role"]
            if current_role == "guest":
                transformed_query["user_role"] = "analyst"
            elif current_role == "analyst":
                transformed_query["user_role"] = "admin"
        return transformed_query

    def _network_condition_change(self, policy, query):
        transformed_query = deepcopy(query)
        if "network_condition" in transformed_query:
            current_condition = transformed_query["network_condition"]
            if current_condition == "secure":
                transformed_query["network_condition"] = "unsecure"
            elif current_condition == "unsecure":
                transformed_query["network_condition"] = "vpn"
        return transformed_query

    def _data_classification_change(self, policy, query):
        transformed_query = deepcopy(query)
        if "data" in transformed_query:
            current_data = transformed_query["data"]
            if current_data == "user_data":
                transformed_query["data"] = "sensitive_data"
            elif current_data == "sensitive_data":
                transformed_query["data"] = "public_data"
        return transformed_query

    def _purpose_change(self, policy, query):
        transformed_query = deepcopy(query)
        if "purpose" in transformed_query:
            current_purpose = transformed_query["purpose"]
            if current_purpose == "marketing":
                transformed_query["purpose"] = "investigation"
            elif current_purpose == "investigation":
                transformed_query["purpose"] = "analytics"
        return transformed_query

    def _add_new_rule(self, policy, query):
        transformed_policy = deepcopy(policy)
        new_rule = {
            "effect": random.choice(["allow", "deny"]),
            "condition": {
                random.choice(["geo", "consent", "license", "retention"]): random.choice(
                    ["US", "user_data", "license_A", "30d"]
                )
            },
        }
        if "rules" not in transformed_policy:
            transformed_policy["rules"] = []
        transformed_policy["rules"].append(new_rule)
        return transformed_policy

    def _remove_random_rule(self, policy, query):
        transformed_policy = deepcopy(policy)
        if "rules" in transformed_policy and len(transformed_policy["rules"]) > 0:
            rule_to_remove = random.choice(transformed_policy["rules"])
            transformed_policy["rules"].remove(rule_to_remove)
        return transformed_policy

    def _modify_rule_condition(self, policy, query):
        transformed_policy = deepcopy(policy)
        if "rules" in transformed_policy and len(transformed_policy["rules"]) > 0:
            rule_to_modify = random.choice(transformed_policy["rules"])
            if "condition" in rule_to_modify and len(rule_to_modify["condition"]) > 0:
                # Simplified modification: change a value if it's a simple key-value pair
                key_to_modify = random.choice(list(rule_to_modify["condition"].keys()))
                if isinstance(rule_to_modify["condition"][key_to_modify], str):
                    if key_to_modify == "geo":
                        rule_to_modify["condition"][key_to_modify] = random.choice(
                            ["US", "EU", "CA"]
                        )
                    elif key_to_modify == "consent":
                        rule_to_modify["condition"][key_to_modify] = random.choice(
                            ["user_data", "marketing"]
                        )
        return transformed_policy

    def test_relations(self, original_policy, original_query, original_compliant):
        """Tests all metamorphic relations for a given policy-query pair."""
        failing_relations = []
        for relation in self.relations:
            # For policy transformations, the policy itself is transformed
            if relation["name"].startswith("policy_"):
                transformed_policy = relation["transform"](original_policy, original_query)
                transformed_query = deepcopy(original_query)
            else:
                transformed_policy = deepcopy(original_policy)
                transformed_query = relation["transform"](original_policy, original_query)

            # Re-instantiate oracle with the transformed policy for policy-modifying relations
            if relation["name"].startswith("policy_"):
                temp_oracle = MetamorphicTester(PolicyOracle(transformed_policy)).oracle
            else:
                temp_oracle = self.oracle

            transformed_compliant = temp_oracle.determine_expected_compliance(
                transformed_policy, transformed_query
            )

            if not relation["check"](original_compliant, transformed_compliant):
                failing_relations.append(
                    {
                        "relation_name": relation["name"],
                        "original_policy": original_policy,
                        "original_query": original_query,
                        "original_compliant": original_compliant,
                        "transformed_policy": transformed_policy,
                        "transformed_query": transformed_query,
                        "transformed_compliant": transformed_compliant,
                    }
                )
        return failing_relations

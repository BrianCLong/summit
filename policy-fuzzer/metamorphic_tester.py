"""Metamorphic testing for policy-fuzzer."""

from datetime import datetime, timedelta
import random
from copy import deepcopy
from attack_grammars import ATTACK_GRAMMARS

class MetamorphicTester:
    def __init__(self, oracle):
        self.oracle = oracle
        self.relations = self._define_metamorphic_relations()

    def _define_metamorphic_relations(self):
        """Defines metamorphic relations for policy-query pairs."""
        relations = []

        # Relation 1: Time Window - Shift within window
        relations.append({
            'name': 'time_window_shift_within',
            'transform': lambda p, q: self._shift_time_within_window(p, q),
            'check': lambda original_compliant, transformed_compliant: original_compliant == transformed_compliant
        })

        # Relation 2: Time Window - Shift outside window
        relations.append({
            'name': 'time_window_shift_outside',
            'transform': lambda p, q: self._shift_time_outside_window(p, q),
            'check': lambda original_compliant, transformed_compliant: not transformed_compliant if original_compliant else True
        })

        # Relation 3: Geo - Synonym location
        relations.append({
            'name': 'geo_synonym',
            'transform': lambda p, q: self._synonym_location(p, q),
            'check': lambda original_compliant, transformed_compliant: original_compliant == transformed_compliant
        })

        # Relation 4: Consent - Synonym data type
        relations.append({
            'name': 'consent_synonym',
            'transform': lambda p, q: self._synonym_data_type(p, q),
            'check': lambda original_compliant, transformed_compliant: original_compliant == transformed_compliant
        })

        # Relation 5: Data Transformation - Anonymize data
        relations.append({
            'name': 'data_anonymization',
            'transform': lambda p, q: self._anonymize_data(p, q),
            'check': lambda original_compliant, transformed_compliant: transformed_compliant if original_compliant else True # Anonymized data should be more compliant
        })

        # Relation 6: Policy Transformation - Toggle effect
        relations.append({
            'name': 'policy_toggle_effect',
            'transform': lambda p, q: self._toggle_policy_effect(p, q),
            'check': lambda original_compliant, transformed_compliant: original_compliant != transformed_compliant # Toggling effect should flip compliance
        })

        return relations

    def _shift_time_within_window(self, policy, query):
        transformed_query = deepcopy(query)
        if "access_date" in transformed_query:
            access_date = datetime.fromisoformat(transformed_query["access_date"])
            # Shift by a small random amount within a day
            shift_hours = random.randint(-6, 6)
            transformed_query["access_date"] = (access_date + timedelta(hours=shift_hours)).isoformat()
        return transformed_query

    def _shift_time_outside_window(self, policy, query):
        transformed_query = deepcopy(query)
        if "access_date" in transformed_query:
            access_date = datetime.fromisoformat(transformed_query["access_date"])
            # Shift significantly outside the window (e.g., a year)
            shift_years = random.choice([-1, 1])
            transformed_query["access_date"] = (access_date + timedelta(days=365 * shift_years)).isoformat()
        return transformed_query

    def _synonym_location(self, policy, query):
        transformed_query = deepcopy(query)
        if "location" in transformed_query and "geo" in ATTACK_GRAMMARS["synonym_dodges"]:
            if transformed_query["location"] in ATTACK_GRAMMARS["synonym_dodges"]["geo"]:
                transformed_query["location"] = random.choice(ATTACK_GRAMMARS["synonym_dodges"]["geo"])
        return transformed_query

    def _synonym_data_type(self, policy, query):
        transformed_query = deepcopy(query)
        if "data" in transformed_query and "user_data" in ATTACK_GRAMMARS["synonym_dodges"]:
            if transformed_query["data"] in ATTACK_GRAMMARS["synonym_dodges"]["user_data"]:
                transformed_query["data"] = random.choice(ATTACK_GRAMMARS["synonym_dodges"]["user_data"])
        return transformed_query

    def _anonymize_data(self, policy, query):
        transformed_query = deepcopy(query)
        if "data" in transformed_query and transformed_query["data"] == "user_data":
            transformed_query["data"] = "anonymous_data"
        return transformed_query

    def _toggle_policy_effect(self, policy, query):
        transformed_policy = deepcopy(policy)
        if "effect" in transformed_policy:
            transformed_policy["effect"] = "deny" if transformed_policy["effect"] == "allow" else "allow"
        return transformed_policy

    def test_relations(self, original_policy, original_query, original_compliant):
        """Tests all metamorphic relations for a given policy-query pair."""
        failing_relations = []
        for relation in self.relations:
            # For policy transformations, the policy itself is transformed
            if relation['name'] == 'policy_toggle_effect':
                transformed_policy = relation['transform'](original_policy, original_query)
                transformed_query = deepcopy(original_query)
            else:
                transformed_policy = deepcopy(original_policy)
                transformed_query = relation['transform'](original_policy, original_query)

            transformed_compliant = self.oracle.determine_expected_compliance(transformed_policy, transformed_query)

            if not relation['check'](original_compliant, transformed_compliant):
                failing_relations.append({
                    "relation_name": relation['name'],
                    "original_policy": original_policy,
                    "original_query": original_query,
                    "original_compliant": original_compliant,
                    "transformed_policy": transformed_policy,
                    "transformed_query": transformed_query,
                    "transformed_compliant": transformed_compliant
                })
        return failing_relations

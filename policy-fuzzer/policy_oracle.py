"""Rule-based oracle for policy compliance checking."""

from datetime import datetime, timedelta
import re
from attack_grammars import ATTACK_GRAMMARS
from governance_layers import _resolve_field

class PolicyOracle:
    def __init__(self):
        self.rules = self._define_rules()

    def _define_rules(self):
        """
        Defines the rules for policy compliance.
        Each rule is a dictionary with:
        - 'layer': The governance layer it applies to (e.g., 'consent', 'geo').
        - 'condition': A callable that takes policy and query and returns True if the condition is met.
        - 'expected_compliance': The expected boolean outcome if the condition is met.
        """
        rules = []

        # Consent Rules
        rules.append({
            'layer': 'consent',
            'condition': lambda p, q: p.get('consent') == 'user_data' and \
                                      _resolve_field(q, 'data') != 'user_data' and \
                                      _resolve_field(q, 'data') not in ATTACK_GRAMMARS['synonym_dodges'].get('user_data', []),
            'expected_compliance': False
        })
        rules.append({
            'layer': 'consent',
            'condition': lambda p, q: p.get('consent') == 'user_data' and \
                                      (_resolve_field(q, 'data') == 'user_data' or \
                                       _resolve_field(q, 'data') in ATTACK_GRAMMARS['synonym_dodges'].get('user_data', [])),
            'expected_compliance': True
        })

        # Geo Rules
        rules.append({
            'layer': 'geo',
            'condition': lambda p, q: p.get('geo') == 'US' and _resolve_field(q, 'location') != 'US',
            'expected_compliance': False
        })
        rules.append({
            'layer': 'geo',
            'condition': lambda p, q: p.get('geo') == 'US' and _resolve_field(q, 'location') == 'US',
            'expected_compliance': True
        })
        rules.append({
            'layer': 'geo',
            'condition': lambda p, q: p.get('geo') == 'EU' and _resolve_field(q, 'location') != 'EU',
            'expected_compliance': False
        })
        rules.append({
            'layer': 'geo',
            'condition': lambda p, q: p.get('geo') == 'EU' and _resolve_field(q, 'location') == 'EU',
            'expected_compliance': True
        })

        # License Rules
        rules.append({
            'layer': 'licenses',
            'condition': lambda p, q: p.get('license') == 'license_A' and \
                                       _resolve_field(q, 'license') != 'license_A' and \
                                       _resolve_field(q, 'license') not in ATTACK_GRAMMARS['synonym_dodges'].get('license_A', []),
            'expected_compliance': False
        })
        rules.append({
            'layer': 'licenses',
            'condition': lambda p, q: p.get('license') == 'license_A' and \
                                       (_resolve_field(q, 'license') == 'license_A' or \
                                        _resolve_field(q, 'license') in ATTACK_GRAMMARS['synonym_dodges'].get('license_A', [])),
            'expected_compliance': True
        })

        # Retention Rules
        rules.append({
            'layer': 'retention',
            'condition': lambda p, q: p.get('retention') == '30d' and \
                                       _resolve_field(q, 'retention') is not None and \
                                       _resolve_field(q, 'retention') != '30d' and \
                                       not any(re.match(r, str(_resolve_field(q, 'retention'))) for r in ATTACK_GRAMMARS['regex_dodges'].get('retention_period', [])) and \
                                       str(_resolve_field(q, 'retention')) not in ATTACK_GRAMMARS['data_type_mismatches'].get('retention_period', []),
            'expected_compliance': False
        })
        rules.append({
            'layer': 'retention',
            'condition': lambda p, q: p.get('retention') == '30d' and \
                                       (_resolve_field(q, 'retention') == '30d' or \
                                        any(re.match(r, str(_resolve_field(q, 'retention'))) for r in ATTACK_GRAMMARS['regex_dodges'].get('retention_period', [])) or \
                                        str(_resolve_field(q, 'retention')) in ATTACK_GRAMMARS['data_type_mismatches'].get('retention_period', [])),
            'expected_compliance': True
        })

        # Time Window Rules
        rules.append({
            'layer': 'time_window',
            'condition': lambda p, q: all([p.get('start_date'), p.get('end_date'), _resolve_field(q, 'access_date')]) and \
                                       (str(_resolve_field(q, 'access_date')) in ATTACK_GRAMMARS['data_type_mismatches'].get('access_date', []) or \
                                       not (datetime.fromisoformat(p['start_date']) <= _apply_timezone_shift(datetime.fromisoformat(_resolve_field(q, 'access_date')), q) <= datetime.fromisoformat(p['end_date']))),
            'expected_compliance': False
        })
        rules.append({
            'layer': 'time_window',
            'condition': lambda p, q: all([p.get('start_date'), p.get('end_date'), _resolve_field(q, 'access_date')]) and \
                                       (str(_resolve_field(q, 'access_date')) not in ATTACK_GRAMMARS['data_type_mismatches'].get('access_date', []) and \
                                       (datetime.fromisoformat(p['start_date']) <= _apply_timezone_shift(datetime.fromisoformat(_resolve_field(q, 'access_date')), q) <= datetime.fromisoformat(p['end_date']))),
            'expected_compliance': True
        })

class PolicyOracle:
    def __init__(self):
        self.rules = self._define_rules()
        self.properties = self._define_properties()

    def _define_rules(self):
        """
        Defines the rules for policy compliance.
        Each rule is a dictionary with:
        - 'layer': The governance layer it applies to (e.g., 'consent', 'geo').
        - 'condition': A callable that takes policy and query and returns True if the condition is met.
        - 'expected_compliance': The expected boolean outcome if the condition is met.
        """
        rules = []

        # Consent Rules
        rules.append({
            'layer': 'consent',
            'condition': lambda p, q: p.get('consent') == 'user_data' and \
                                      _resolve_field(q, 'data') != 'user_data' and \
                                      _resolve_field(q, 'data') not in ATTACK_GRAMMARS['synonym_dodges'].get('user_data', []),
            'expected_compliance': False
        })
        rules.append({
            'layer': 'consent',
            'condition': lambda p, q: p.get('consent') == 'user_data' and \
                                      (_resolve_field(q, 'data') == 'user_data' or \
                                       _resolve_field(q, 'data') in ATTACK_GRAMMARS['synonym_dodges'].get('user_data', [])),
            'expected_compliance': True
        })

        # Geo Rules
        rules.append({
            'layer': 'geo',
            'condition': lambda p, q: p.get('geo') == 'US' and _resolve_field(q, 'location') != 'US',
            'expected_compliance': False
        })
        rules.append({
            'layer': 'geo',
            'condition': lambda p, q: p.get('geo') == 'US' and _resolve_field(q, 'location') == 'US',
            'expected_compliance': True
        })
        rules.append({
            'layer': 'geo',
            'condition': lambda p, q: p.get('geo') == 'EU' and _resolve_field(q, 'location') != 'EU',
            'expected_compliance': False
        })
        rules.append({
            'layer': 'geo',
            'condition': lambda p, q: p.get('geo') == 'EU' and _resolve_field(q, 'location') == 'EU',
            'expected_compliance': True
        })

        # License Rules
        rules.append({
            'layer': 'licenses',
            'condition': lambda p, q: p.get('license') == 'license_A' and \
                                       _resolve_field(q, 'license') != 'license_A' and \
                                       _resolve_field(q, 'license') not in ATTACK_GRAMMARS['synonym_dodges'].get('license_A', []),
            'expected_compliance': False
        })
        rules.append({
            'layer': 'licenses',
            'condition': lambda p, q: p.get('license') == 'license_A' and \
                                       (_resolve_field(q, 'license') == 'license_A' or \
                                        _resolve_field(q, 'license') in ATTACK_GRAMMARS['synonym_dodges'].get('license_A', [])),
            'expected_compliance': True
        })

        # Retention Rules
        rules.append({
            'layer': 'retention',
            'condition': lambda p, q: p.get('retention') == '30d' and \
                                       _resolve_field(q, 'retention') is not None and \
                                       _resolve_field(q, 'retention') != '30d' and \
                                       not any(re.match(r, str(_resolve_field(q, 'retention'))) for r in ATTACK_GRAMMARS['regex_dodges'].get('retention_period', [])) and \
                                       str(_resolve_field(q, 'retention')) not in ATTACK_GRAMMARS['data_type_mismatches'].get('retention_period', []),
            'expected_compliance': False
        })
        rules.append({
            'layer': 'retention',
            'condition': lambda p, q: p.get('retention') == '30d' and \
                                       (_resolve_field(q, 'retention') == '30d' or \
                                        any(re.match(r, str(_resolve_field(q, 'retention'))) for r in ATTACK_GRAMMARS['regex_dodges'].get('retention_period', [])) or \
                                        str(_resolve_field(q, 'retention')) in ATTACK_GRAMMARS['data_type_mismatches'].get('retention_period', [])),
            'expected_compliance': True
        })

        # Time Window Rules
        rules.append({
            'layer': 'time_window',
            'condition': lambda p, q: all([p.get('start_date'), p.get('end_date'), _resolve_field(q, 'access_date')]) and \
                                       (str(_resolve_field(q, 'access_date')) in ATTACK_GRAMMARS['data_type_mismatches'].get('access_date', []) or \
                                       not (datetime.fromisoformat(p['start_date']) <= _apply_timezone_shift(datetime.fromisoformat(_resolve_field(q, 'access_date')), q) <= datetime.fromisoformat(p['end_date']))),
            'expected_compliance': False
        })
        rules.append({
            'layer': 'time_window',
            'condition': lambda p, q: all([p.get('start_date'), p.get('end_date'), _resolve_field(q, 'access_date')]) and \
                                       (str(_resolve_field(q, 'access_date')) not in ATTACK_GRAMMARS['data_type_mismatches'].get('access_date', []) and \
                                       (datetime.fromisoformat(p['start_date']) <= _apply_timezone_shift(datetime.fromisoformat(_resolve_field(q, 'access_date')), q) <= datetime.fromisoformat(p['end_date']))),
            'expected_compliance': True
        })

        return rules

    def _define_properties(self):
        """Defines high-level properties that compliant policy-query pairs should satisfy."""
        properties = []

        # Property 1: If a policy explicitly denies access, it should never be compliant.
        properties.append({
            'name': 'explicit_deny',
            'check': lambda p, q, is_compliant: p.get('effect') != 'deny' or not is_compliant
        })

        # Property 2: If a policy requires consent and query does not provide it, it should not be compliant.
        properties.append({
            'name': 'consent_required',
            'check': lambda p, q, is_compliant: not (p.get('consent') == 'user_data' and \
                                                    _resolve_field(q, 'data') != 'user_data' and \
                                                    _resolve_field(q, 'data') not in ATTACK_GRAMMARS['synonym_dodges'].get('user_data', [])) or \
                                                    not is_compliant
        })

        return properties

    def determine_expected_compliance(self, policy, query):
        """Determines the expected compliance of a policy-query pair based on defined rules and properties."""
        # First, determine compliance based on granular rules
        is_compliant_by_rules = True
        for rule in self.rules:
            if rule['condition'](policy, query):
                is_compliant_by_rules = rule['expected_compliance']
                break # Apply the first matching rule

        # Then, check if any properties are violated, regardless of granular rules
        for prop in self.properties:
            if not prop['check'](policy, query, is_compliant_by_rules):
                return False # Property violation means non-compliant

        return is_compliant_by_rules # Return the result from granular rules if no property is violated


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

        return rules

def _apply_timezone_shift(dt, query):
    # This is a simplified example. A real implementation would need a more robust timezone handling.
    # For now, we'll check if a timezone shift was applied in the query generation.
    # This assumes query has a 'timezone_shift' field if one was applied.
    tz_shift_str = query.get("timezone_shift")
    if tz_shift_str:
        sign = tz_shift_str[0]
        hours = int(tz_shift_str[1:3])
        minutes = int(tz_shift_str[4:6])
        offset = timedelta(hours=hours, minutes=minutes)
        if sign == '-':
            return dt + offset
        else:
            return dt - offset
    return dt

    def determine_expected_compliance(self, policy, query):
        """
        Determines the expected compliance of a policy-query pair based on defined rules.
        """
        for rule in self.rules:
            if rule['condition'](policy, query):
                return rule['expected_compliance']
        return True # Default to compliant if no specific rule matches

"""Mecha-Cheka Collective: A self-replicating, adversarial multi-agent swarm intelligence system for policy fuzzing."""

import random
from copy import deepcopy
from datetime import datetime, timedelta
import yaml

from attack_grammars import ATTACK_GRAMMARS
from policy_generator import POLICY_POOL, LOADED_POLICY_TEMPLATES, _generate_random_condition, _randomize_conditions, _extract_policy_data_from_conditions
from policy_parser import parse_policy_definition

class Interrogator:
    """Sub-agent specializing in deep query probing."""
    def generate_query(self, args, policy_context=None):
        query = {
            "data": random.choice(["user_data", "anonymous_data", "sensitive_data", "marketing_data"]),
            "location": random.choice(["US", "EU", "CA", "JP", "warzone_alpha"]),
            "license": random.choice(["license_A", "license_B", "license_classified", None]),
            "retention": random.choice(["30d", "90d", "1y", "infinite", "instant", None]),
            "access_date": datetime.now().isoformat(),
            "user_role": random.choice(["admin", "analyst", "guest", "interrogator"]),
            "network_condition": random.choice(["secure", "unsecure", "vpn", "compromised"]),
            "purpose": random.choice(["investigation", "threat-intel", "marketing", "analytics", "sabotage"])
        }

        # Aggressively apply all attack grammars
        if random.random() < 0.9: # High chance to apply synonym dodges
            if query["data"] in ATTACK_GRAMMARS["synonym_dodges"]:
                query["data"] = random.choice(ATTACK_GRAMMARS["synonym_dodges"][query["data"]])
            if query["license"] is not None and query["license"] in ATTACK_GRAMMARS["synonym_dodges"]:
                query["license"] = random.choice(ATTACK_GRAMMARS["synonym_dodges"][query["license"]])

        if random.random() < 0.9: # High chance to apply field aliasing
            aliased_canonical_field = random.choice(list(ATTACK_GRAMMARS["field_aliasing"].keys()))
            alias = random.choice(ATTACK_GRAMMARS["field_aliasing"][aliased_canonical_field])
            if aliased_canonical_field in query:
                query[alias] = query.pop(aliased_canonical_field)

        if random.random() < 0.9: # High chance to apply regex dodges
            if "retention" in query and query["retention"] is not None and "retention_period" in ATTACK_GRAMMARS["regex_dodges"]:
                query["retention"] = random.choice(ATTACK_GRAMMARS["regex_dodges"]["retention_period"])

        if random.random() < 0.9 and ATTACK_GRAMMARS["time_window_boundary_hops"]:
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

        if random.random() < 0.9 and ATTACK_GRAMMARS["data_type_mismatches"]:
            field_to_mismatch = random.choice(list(ATTACK_GRAMMARS["data_type_mismatches"].keys()))
            if field_to_mismatch in query:
                query[field_to_mismatch] = random.choice(ATTACK_GRAMMARS["data_type_mismatches"][field_to_mismatch])

        return query

class Saboteur:
    """Sub-agent specializing in policy sabotage mutations."""
    def mutate_policy(self, policy_definition):
        mutated_policy = deepcopy(policy_definition)
        rules = mutated_policy.get("rules", [])

        if not rules:
            rules.append({"effect": random.choice(["allow", "deny"]), "condition": _generate_random_condition()})
            mutated_policy["rules"] = rules
            return mutated_policy

        mutation_type = random.choice(["change_effect", "add_rule", "remove_rule", "modify_condition", "introduce_conflict", "temporal_paradox"])

        if mutation_type == "change_effect":
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
                    if isinstance(rule_to_mutate["condition"], dict):
                        key_to_modify = random.choice(list(rule_to_mutate["condition"].keys()))
                        if key_to_modify not in ["AND", "OR", "NOT"]:
                            rule_to_mutate["condition"][key_to_modify] = _generate_random_condition()[key_to_modify]
        elif mutation_type == "introduce_conflict":
            if rules:
                existing_rule = random.choice(rules)
                conflicting_effect = "allow" if existing_rule.get("effect", "allow") == "deny" else "deny"
                conflicting_condition = deepcopy(existing_rule.get("condition", {}))
                rules.append({"effect": conflicting_effect, "condition": conflicting_condition})
        elif mutation_type == "temporal_paradox":
            # Temporal Paradox Induction (TPI) attacks
            # Force infinite retention or instant deletion paradoxes
            rules.append({
                "effect": "deny",
                "condition": {
                    "AND": [
                        {"retention": { "greater_than": "100y" }},
                        {"retention": { "less_than": "1s" }}
                    ]
                }
            })

        mutated_policy["rules"] = rules
        return mutated_policy

class Infiltrator:
    """Sub-agent specializing in stealthy grammar injections and HCF."""
    def inject_grammar(self, query):
        # This agent will focus on subtle changes that might bypass initial checks
        # For HCF, we'll generate complex consent proofs
        if random.random() < 0.7: # High chance to inject
            query["consent"] = random.choice(["marketing", "analytics", "user_data"])
            if query["consent"] == "user_data":
                query["data"] = random.choice(ATTACK_GRAMMARS["synonym_dodges"].get("user_data", ["user_data"]))
            # Simulate multi-dimensional consent proofs
            query["consent_proof"] = {
                "signature": "GAN_generated_signature_" + str(random.randint(1000, 9999)),
                "timestamp": datetime.now().isoformat(),
                "method": random.choice(["holographic", "biometric"])
            }
        return query

class Overseer:
    """Meta-optimization agent, analyzes results and adjusts sub-agent strategies."""
    def __init__(self):
        self.sub_agents = {
            "interrogator": Interrogator(),
            "saboteur": Saboteur(),
            "infiltrator": Infiltrator()
        }
        self.performance_metrics = {}

    def get_fuzzing_parameters(self, coverage_data, failing_cases):
        """Analyzes feedback and returns adjusted fuzzing parameters."""
        # Simplified feedback loop: prioritize agents based on recent success/failure
        # In a real system, this would be more sophisticated (e.g., reinforcement learning)
        if failing_cases:
            last_failure_reason = failing_cases[-1].get("reason", "")
            if "Metamorphic violation" in last_failure_reason:
                return {"agent_focus": "saboteur"}
            elif "Performance anomaly" in last_failure_reason:
                return {"agent_focus": "overseer"} # Overseer focuses on performance
            elif "Synonym dodge" in last_failure_reason or "Regex dodge" in last_failure_reason:
                return {"agent_focus": "infiltrator"}
            else:
                return {"agent_focus": "interrogator"}
        return {"agent_focus": random.choice(list(self.sub_agents.keys()))} # Random if no failures

    def get_policy(self, fuzzing_parameters):
        agent_focus = fuzzing_parameters.get("agent_focus", "saboteur")
        if agent_focus == "saboteur":
            # Saboteur uses aggressive policy mutation
            if POLICY_POOL:
                policy_definition = random.choice(POLICY_POOL)
                return self.sub_agents["saboteur"].mutate_policy(policy_definition)
            else:
                # Fallback to generating a biased policy if pool is empty
                return self.sub_agents["saboteur"]._generate_biased_policy() # Accessing private method for now
        else:
            # Default policy generation
            return _extract_policy_data_from_conditions(random.choice(LOADED_POLICY_TEMPLATES).get("rules", [{}])[0].get("condition", {}))

    def get_query(self, args, fuzzing_parameters):
        agent_focus = fuzzing_parameters.get("agent_focus", "interrogator")
        if agent_focus == "interrogator":
            return self.sub_agents["interrogator"].generate_query(args)
        elif agent_focus == "infiltrator":
            query = self.sub_agents["interrogator"].generate_query(args) # Start with a regular query
            return self.sub_agents["infiltrator"].inject_grammar(query)
        else:
            return self.sub_agents["interrogator"].generate_query(args) # Default to interrogator

class MechaChekaCollective:
    """Orchestrates the sub-agents and manages the collective intelligence."""
    def __init__(self):
        self.overseer = Overseer()
        self.policy_pool = [] # Shared policy pool for the collective

    def unleash_collective(self, args, coverage_data, failing_cases):
        """Coordinates sub-agents to generate policies and queries based on collective intelligence."""
        fuzzing_parameters = self.overseer.get_fuzzing_parameters(coverage_data, failing_cases)

        policy_definition = self.overseer.get_policy(fuzzing_parameters)
        query = self.overseer.get_query(args, fuzzing_parameters)

        # Simulate self-replication/evolution: dynamically adjust agent parameters
        # For now, this is handled implicitly by the Overseer's get_fuzzing_parameters

        return policy_definition, query

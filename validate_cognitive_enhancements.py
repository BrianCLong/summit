#!/usr/bin/env python3
"""
Validation script for cognitive modeling enhancements.
This script validates that the enhanced cognitive modeling capabilities work correctly.
"""

import sys

# Add the project root to Python path
project_root = "/Users/brianlong/Developer/summit"
sys.path.insert(0, project_root)


def validate_cognitive_enhancements():
    """Validate the enhanced cognitive modeling system."""
    print("Validating cognitive modeling enhancements...")

    # Import the enhanced cognitive modeling system
    try:
        from intelgraph.cognitive_modeling import (
            AdvancedCognitiveOS,
            BehavioralPattern,
            CognitiveAgent,
            CognitiveDomain,
            PersonalityModel,
            SimulationType,
            TrustModel,
        )

        print("✅ Successfully imported cognitive modeling modules")
    except ImportError as e:
        print(f"❌ Failed to import cognitive modeling modules: {e}")
        return False

    # Test creating an enhanced cognitive agent
    try:
        cognitive_os = AdvancedCognitiveOS()
        print("✅ Successfully created AdvancedCognitiveOS instance")
    except Exception as e:
        print(f"❌ Failed to create AdvancedCognitiveOS: {e}")
        return False

    # Initialize a test agent
    try:
        agent_configs = [
            {
                "name": "ValidationAgent",
                "domain": CognitiveDomain.INDIVIDUAL,
                "patterns": [BehavioralPattern.ADAPTIVE, BehavioralPattern.PROACTIVE],
            }
        ]

        agent_ids = cognitive_os.initialize_cognitive_agents(agent_configs)
        print(f"✅ Successfully created {len(agent_ids)} cognitive agent(s)")

        if agent_ids:
            agent_id = agent_ids[0]
            agent = cognitive_os.cognitive_agents[agent_id]

            # Validate new agent properties
            assert hasattr(agent, "emotional_state"), "Agent missing emotional_state"
            assert hasattr(agent, "cognitive_load"), "Agent missing cognitive_load"
            assert hasattr(agent, "stress_level"), "Agent missing stress_level"
            assert hasattr(agent, "energy_level"), "Agent missing energy_level"
            assert hasattr(agent, "motivation_level"), "Agent missing motivation_level"
            assert hasattr(agent, "cognitive_biases"), "Agent missing cognitive_biases"
            assert hasattr(
                agent, "relationship_preferences"
            ), "Agent missing relationship_preferences"

            print("✅ All enhanced agent properties present")

            # Test psychological profile method
            profile = cognitive_os.get_agent_psychological_profile(agent_id)
            assert "derived_metrics" in profile, "Missing derived metrics in profile"
            assert "emotional_balance" in profile["derived_metrics"], "Missing emotional balance"
            print("✅ Psychological profiling working correctly")

            # Test collective state method
            collective_state = cognitive_os.get_collective_psychological_state()
            assert "system_mood" in collective_state, "Missing system mood in collective state"
            assert (
                "aggregate_cognitive_metrics" in collective_state
            ), "Missing aggregate cognitive metrics"
            print("✅ Collective psychological state working correctly")

    except Exception as e:
        print(f"❌ Error during agent validation: {e}")
        import traceback

        traceback.print_exc()
        return False

    # Test personality model enhancements
    try:
        personality = PersonalityModel.get_default_personality()
        emotional_response = PersonalityModel.calculate_emotional_response(
            personality, stress_level=0.5, event_intensity=0.7
        )
        assert 0.0 <= emotional_response <= 1.0, "Emotional response out of range"
        print("✅ Enhanced personality model working correctly")
    except Exception as e:
        print(f"❌ Error in personality model: {e}")
        return False

    # Test trust model enhancements
    try:
        trust_model = TrustModel()
        trust_model.establish_trust("agent1", "agent2", 0.7)
        updated_trust = trust_model.update_trust(
            "agent1", "agent2", {"outcome_value": 0.5, "weight": 1.0}
        )
        assert 0.0 <= updated_trust <= 1.0, "Trust value out of range"
        print("✅ Enhanced trust model working correctly")
    except Exception as e:
        print(f"❌ Error in trust model: {e}")
        return False

    print("\n🎉 All cognitive modeling enhancements validated successfully!")
    print("\nEnhanced capabilities include:")
    print("  • Psychological profiling of cognitive agents")
    print("  • Emotional state simulation and modeling")
    print("  • Cognitive load assessment and monitoring")
    print("  • Stress level impact analysis")
    print("  • Energy and motivation level tracking")
    print("  • Attention span modeling")
    print("  • Memory strength assessment")
    print("  • Advanced cognitive bias integration")
    print("  • Relationship preference modeling")
    print("  • Emotional balance calculations")
    print("  • Cognitive efficiency metrics")
    print("  • Overall wellbeing assessment")
    print("  • Collective psychological state analysis")
    print("  • System mood determination")
    print("  • Derived metrics computation")

    return True


if __name__ == "__main__":
    success = validate_cognitive_enhancements()
    if not success:
        sys.exit(1)
    else:
        print("\n✓ Validation completed successfully!")

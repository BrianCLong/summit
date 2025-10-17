#!/usr/bin/env python3
"""
Demonstration of Cognitive Bias Mitigation System Integration with IntelGraph
"""

import sys
import os

# Add project root to Python path
project_root = "/Users/brianlong/Developer/summit"
sys.path.insert(0, project_root)

def demonstrate_bias_mitigation():
    """Demonstrate the cognitive bias mitigation system working with IntelGraph."""
    print("🧠 IntelGraph Cognitive Bias Mitigation System Demonstration")
    print("=" * 70)
    
    try:
        # Import IntelGraph cognitive modeling components
        from intelgraph.cognitive_modeling import (
            AdvancedCognitiveOS, 
            CognitiveDomain, 
            BehavioralPattern,
            CognitiveAgent
        )
        
        # Import bias mitigation components
        from intelgraph.cognitive_bias_detector import BiasDetector
        from intelgraph.debiasing_engine import DebiasingEngine
        from intelgraph.metacognitive_system import MetacognitiveSystem
        from intelgraph.cognitive_bias_mitigation_integration import CognitiveBiasMitigationSystem
        
        print(f"\n✅ Successfully imported IntelGraph and Bias Mitigation components")
        
        # Create IntelGraph cognitive OS
        cognitive_os = AdvancedCognitiveOS()
        print(f"✅ Created AdvancedCognitiveOS instance")
        
        # Create cognitive agents
        agent_configs = [
            {
                "name": "StrategicDecisionMaker",
                "domain": CognitiveDomain.INDIVIDUAL,
                "patterns": [BehavioralPattern.PROACTIVE, BehavioralPattern.ADAPTIVE]
            },
            {
                "name": "AnalyticalEvaluator",
                "domain": CognitiveDomain.TECHNICAL,
                "patterns": [BehavioralPattern.HABITUAL, BehavioralPattern.REACTIVE]
            }
        ]
        
        agent_ids = cognitive_os.initialize_cognitive_agents(agent_configs)
        print(f"✅ Created {len(agent_ids)} cognitive agents")
        
        # Show agent details
        for agent_id in agent_ids:
            agent = cognitive_os.cognitive_agents[agent_id]
            print(f"  🧠 Agent: {agent.name} ({agent.agent_id[:12]}...)")
            print(f"     Domain: {agent.cognitive_domain.value}")
            print(f"     Patterns: {[p.value for p in agent.behavioral_patterns]}")
        
        # Create bias mitigation system
        bias_mitigation_system = CognitiveBiasMitigationSystem()
        print(f"\n🛡️  Created Cognitive Bias Mitigation System")
        print(f"   - Bias Detector: {len(bias_mitigation_system.bias_detector.bias_identifiers)} algorithms")
        print(f"   - Debiasing Engine: {len(bias_mitigation_system.debiasing_engine.debiasing_strategies)} strategies")
        print(f"   - Metacognitive System: Awareness level {bias_mitigation_system.metacognitive_system.awareness_level:.2f}")
        
        # Integrate with cognitive OS
        cognitive_os = bias_mitigation_system.integrate_with_cognitive_os(cognitive_os)
        print(f"✅ Integrated bias mitigation with cognitive OS")
        
        # Create a decision context that might trigger cognitive biases
        decision_context = {
            "scenario": "Evaluating a new technology investment with high potential returns but uncertain risks",
            "options": ["Invest aggressively", "Invest moderately", "Hold off on investment", "Divest from similar holdings"],
            "time_pressure": 0.7,  # Moderate time pressure
            "information_completeness": 0.6,  # Incomplete information
            "cognitive_load": 0.8,  # High cognitive load
            "emotional_state": {
                "dominant_emotion": "optimism",
                "intensity": 0.6,
                "influence_on_decision": 0.5
            },
            "evidence": [
                {"supports": True, "source": "recent_success stories", "reliability": 0.8},
                {"supports": True, "source": "industry reports", "reliability": 0.7},
                {"supports": False, "source": "risk analysis", "reliability": 0.9},
                {"supports": True, "source": "expert opinions", "reliability": 0.6},
                {"supports": False, "source": "market volatility data", "reliability": 0.85}
            ],
            "current_belief": True,  # Tendency toward positive outcome
            "reliance_on_recent_info": 0.8,  # High reliance on recent information
            "seeking_confirming_evidence": 0.75,  # Moderate tendency to seek confirming evidence
            "initial_estimate": 70.0,  # Initial probability estimate
            "final_estimate": 75.0,  # Final probability estimate (only 5% adjustment)
            "adjustment_process": {
                "amount": 5.0,
                "direction": "upward",
                "substantiality": "low"  # Insufficient adjustment
            },
            "expected_outcomes": {
                "positive_outlook": 0.85,  # Very positive outlook
                "negative_outlook": 0.15   # Low negative outlook
            },
            "gains": 100,  # Potential gains
            "losses": -50,  # Potential losses (smaller magnitude)
            "risk_preference": {
                "gain_risk_tolerance": 0.2,  # Low tolerance for risk in gains
                "loss_risk_appetite": 0.4   # Moderate appetite for risk in losses
            },
            "change_options": ["Invest", "Hold", "Divest"],
            "current_state": "current_portfolio",
            "preference_strength": {
                "current_state_preference": 0.75  # Strong preference for current state
            },
            "sunk_costs": {
                "amount_invested": 200,  # Significant previous investment
                "negative_outlook": True,  # Negative outlook on continued investment
                "influence_on_decision": 0.6  # Moderate influence
            },
            "continuation_decision": True,  # Decision to continue investing
            "decision_frame": {
                "presentation": "potential_returns_focused",  # Framed in terms of returns
                "emphasis": "upside_potential",
                "presentation_bias": 0.7  # High presentation bias
            },
            "alternatives": ["safer_investment", "diversification", "cash_preservation"],
            "self_assessment": 0.8,  # High self-assessment of investment acumen
            "information_gathering": {
                "confirming_search": 0.7,  # Heavy focus on confirming evidence
                "disconfirming_search": 0.3  # Light focus on disconfirming evidence
            }
        }
        
        print(f"\n🔍 Analyzing decision context for cognitive biases...")
        
        # Select first agent for analysis
        first_agent_id = agent_ids[0]
        agent = cognitive_os.cognitive_agents[first_agent_id]
        
        # Analyze decision for biases using the integrated system
        analysis_result = cognitive_os._analyze_decision_for_biases(first_agent_id, decision_context)
        
        print(f"✅ Bias analysis completed")
        print(f"   Bias detections: {len(analysis_result['bias_detections'])}")
        print(f"   Debiasing applications: {len(analysis_result['debiasing_results'])}")
        print(f"   Metacognitive insights: {len(analysis_result['metacognitive_reflection']['improvement_suggestions'])} suggestions")
        print(f"   Agent awareness level: {analysis_result['awareness_level']:.2f}")
        
        # Show detected biases
        if analysis_result['bias_detections']:
            print(f"\n⚠️  Detected Cognitive Biases:")
            for i, detection in enumerate(analysis_result['bias_detections'][:5]):  # Show first 5
                print(f"   {i+1}. {detection['bias_type'].replace('_', ' ').title()}")
                print(f"      Confidence: {detection['confidence_score']:.1%}")
                print(f"      Severity: {detection['severity_level']}")
                print(f"      Recommendation: {detection['recommendation'][:60]}...")
        
        # Show debiasing applications
        if analysis_result['debiasing_results']:
            print(f"\n🛠️  Applied Debiasing Strategies:")
            for i, result in enumerate(analysis_result['debiasing_results'][:3]):  # Show first 3
                print(f"   {i+1}. {result['strategy_applied'].replace('_', ' ').title()}")
                print(f"      Effectiveness: {result['effectiveness_score']:.1%}")
                print(f"      Bias reduction: {result['bias_reduction']:.1%}")
        
        # Show metacognitive suggestions
        if analysis_result['metacognitive_reflection']['improvement_suggestions']:
            print(f"\n💡 Metacognitive Improvement Suggestions:")
            for i, suggestion in enumerate(analysis_result['metacognitive_reflection']['improvement_suggestions'][:5]):
                print(f"   {i+1}. {suggestion}")
        
        # Generate comprehensive bias report
        print(f"\n📊 Generating comprehensive bias report...")
        bias_report = cognitive_os._generate_bias_report()
        
        print(f"✅ Bias report generated")
        print(f"   Total agents in system: {bias_report['system_overview']['total_agents']}")
        print(f"   Total bias detections: {bias_report['system_overview']['total_bias_detections']}")
        print(f"   Total reflections: {bias_report['system_overview']['total_reflections']}")
        
        # Show system recommendations
        print(f"\n🚀 System Recommendations:")
        for i, recommendation in enumerate(bias_report['recommendations'][:5]):
            print(f"   {i+1}. {recommendation}")
        
        print(f"\n🎯 Cognitive Bias Mitigation System Successfully Demonstrated!")
        print(f"   - Enhanced IntelGraph agents with bias detection capabilities")
        print(f"   - Applied evidence-based debiasing strategies")
        print(f"   - Generated metacognitive insights for continuous improvement")
        print(f"   - Provided comprehensive analysis and reporting")
        
        return True
        
    except ImportError as e:
        print(f"❌ Import error: {e}")
        print("⚠️  Note: This demonstration requires the IntelGraph cognitive modeling system to be properly configured.")
        return False
    except Exception as e:
        print(f"❌ Error during demonstration: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = demonstrate_bias_mitigation()
    if success:
        print(f"\n🎉 Cognitive Bias Mitigation System is fully operational!")
        print(f"   Ready for integration with IntelGraph cognitive modeling workflows.")
    else:
        print(f"\n❌ Demonstration encountered issues.")
        print(f"   Please check system configuration and dependencies.")
        sys.exit(1)
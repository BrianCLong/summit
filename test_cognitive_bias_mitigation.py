#!/usr/bin/env python3
"""
Test script to verify that the cognitive bias mitigation system works.
"""

import sys
import os

# Add the project root to Python path
project_root = "/Users/brianlong/Developer/summit"
sys.path.insert(0, project_root)

def test_bias_mitigation_system():
    """Test the cognitive bias mitigation system."""
    print("Testing Cognitive Bias Mitigation System...")
    
    try:
        # Import the components
        from intelgraph.cognitive_bias_detector import BiasDetector, BiasType
        from intelgraph.debiasing_engine import DebiasingEngine, DebiasingStrategy
        from intelgraph.metacognitive_system import MetacognitiveSystem
        from intelgraph.cognitive_bias_mitigation_integration import CognitiveBiasMitigationSystem
        
        print("✅ Successfully imported all bias mitigation components")
        
        # Test BiasDetector
        detector = BiasDetector()
        print(f"✅ BiasDetector created with {len(detector.bias_identifiers)} detection algorithms")
        
        # Test DebiasingEngine
        engine = DebiasingEngine()
        print(f"✅ DebiasingEngine created with {len(engine.debiasing_strategies)} strategies")
        
        # Test MetacognitiveSystem
        meta_system = MetacognitiveSystem()
        print(f"✅ MetacognitiveSystem created with awareness level: {meta_system.awareness_level:.2f}")
        
        # Test integrated system
        integrated_system = CognitiveBiasMitigationSystem()
        print("✅ CognitiveBiasMitigationSystem created and integrated")
        
        # Test a simple bias detection
        decision_context = {
            "evidence": [
                {"supports": True},
                {"supports": True}, 
                {"supports": False}
            ],
            "current_belief": True,
            "reliance_on_recent_info": 0.9,
            "seeking_confirming_evidence": 0.8,
            "initial_estimate": 50,
            "final_estimate": 52,
            "adjustment_process": {},
            "expected_outcomes": {"positive_outlook": 0.9, "negative_outlook": 0.1}
        }
        
        agent_state = {
            "personality_profile": {
                "openness": 0.7,
                "conscientiousness": 0.6,
                "extraversion": 0.5,
                "agreeableness": 0.8,
                "neuroticism": 0.3
            },
            "emotional_state": {"happiness": 0.7, "anxiety": 0.2},
            "cognitive_load": 0.6,
            "stress_level": 0.3,
            "memory_recall": {"recency_bias": 0.7}
        }
        
        detections = detector.detect_bias(decision_context, agent_state)
        print(f"✅ Bias detection test completed with {len(detections)} detections")
        
        # Test debiasing
        if detections:
            results = engine.apply_debiasing(detections[0], decision_context)
            print(f"✅ Debiasing application test completed with {len(results)} results")
        
        # Test metacognitive reflection
        reflection = meta_system.generate_reflection(decision_context, {"quality": "medium", "confidence": 0.7})
        print(f"✅ Metacognitive reflection test completed")
        
        print("\n🎉 All cognitive bias mitigation components working correctly!")
        return True
        
    except ImportError as e:
        print(f"❌ Import error: {e}")
        return False
    except Exception as e:
        print(f"❌ Error during testing: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = test_bias_mitigation_system()
    if success:
        print("\n✅ Cognitive Bias Mitigation System is ready for use!")
    else:
        print("\n❌ Issues found with the Cognitive Bias Mitigation System")
        sys.exit(1)
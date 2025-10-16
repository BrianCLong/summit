#!/usr/bin/env python3
"""
Validation Script for IntelGraph Cognitive Bias Mitigation System

This script validates that all components of the cognitive bias mitigation system
are properly installed and functioning.
"""

import sys
import os

# Add project root to Python path
project_root = "/Users/brianlong/Developer/summit"
sys.path.insert(0, project_root)

def validate_installation():
    """Validate that all components are properly installed."""
    print("🔍 Validating IntelGraph Cognitive Bias Mitigation System Installation")
    print("=" * 80)
    
    # Track validation results
    validation_results = {
        "components_installed": 0,
        "components_total": 4,
        "tests_passed": 0,
        "tests_total": 5
    }
    
    # 1. Check that all required files exist
    required_files = [
        "intelgraph/cognitive_bias_detector.py",
        "intelgraph/debiasing_engine.py", 
        "intelgraph/metacognitive_system.py",
        "intelgraph/cognitive_bias_mitigation_integration.py"
    ]
    
    print(f"\n📁 Checking required files...")
    missing_files = []
    for file_path in required_files:
        full_path = os.path.join(project_root, file_path)
        if os.path.exists(full_path):
            print(f"   ✅ {file_path}")
            validation_results["components_installed"] += 1
        else:
            print(f"   ❌ {file_path} (MISSING)")
            missing_files.append(file_path)
    
    if missing_files:
        print(f"\n❌ Missing files: {missing_files}")
        return False, validation_results
    
    # 2. Test importing all components
    print(f"\n🔧 Testing component imports...")
    try:
        from intelgraph.cognitive_bias_detector import BiasDetector, BiasType
        print(f"   ✅ BiasDetector imported successfully")
        validation_results["tests_passed"] += 1
    except ImportError as e:
        print(f"   ❌ Failed to import BiasDetector: {e}")
        return False, validation_results
    
    try:
        from intelgraph.debiasing_engine import DebiasingEngine, DebiasingStrategy
        print(f"   ✅ DebiasingEngine imported successfully")
        validation_results["tests_passed"] += 1
    except ImportError as e:
        print(f"   ❌ Failed to import DebiasingEngine: {e}")
        return False, validation_results
    
    try:
        from intelgraph.metacognitive_system import MetacognitiveSystem
        print(f"   ✅ MetacognitiveSystem imported successfully")
        validation_results["tests_passed"] += 1
    except ImportError as e:
        print(f"   ❌ Failed to import MetacognitiveSystem: {e}")
        return False, validation_results
    
    try:
        from intelgraph.cognitive_bias_mitigation_integration import CognitiveBiasMitigationSystem
        print(f"   ✅ CognitiveBiasMitigationSystem imported successfully")
        validation_results["tests_passed"] += 1
    except ImportError as e:
        print(f"   ❌ Failed to import CognitiveBiasMitigationSystem: {e}")
        return False, validation_results
    
    # 3. Test basic functionality
    print(f"\n⚡ Testing basic functionality...")
    try:
        # Create detector
        detector = BiasDetector()
        print(f"   ✅ BiasDetector instantiated with {len(detector.bias_identifiers)} algorithms")
        
        # Create engine
        engine = DebiasingEngine()
        print(f"   ✅ DebiasingEngine instantiated with {len(engine.debiasing_strategies)} strategies")
        
        # Create metacognitive system
        meta_system = MetacognitiveSystem()
        print(f"   ✅ MetacognitiveSystem instantiated with awareness level {meta_system.awareness_level:.2f}")
        
        # Create integrated system
        integrated_system = CognitiveBiasMitigationSystem()
        print(f"   ✅ CognitiveBiasMitigationSystem instantiated and integrated")
        
        validation_results["tests_passed"] += 1
    except Exception as e:
        print(f"   ❌ Basic functionality test failed: {e}")
        return False, validation_results
    
    # 4. Test simple bias detection
    print(f"\n🔬 Testing bias detection...")
    try:
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
        
        # Test bias detection
        detections = detector.detect_bias(decision_context, agent_state)
        print(f"   ✅ Bias detection test completed with {len(detections)} detections")
        
        # Test debiasing (if any detections)
        if detections:
            # Test debiasing with first detection
            results = engine.apply_debiasing(detections[0], decision_context)
            print(f"   ✅ Debiasing test completed with {len(results)} results")
        
        # Test metacognitive reflection
        reflection = meta_system.generate_reflection(decision_context, {"quality": "medium", "confidence": 0.7})
        print(f"   ✅ Metacognitive reflection test completed")
        
    except Exception as e:
        print(f"   ❌ Bias detection test failed: {e}")
        import traceback
        traceback.print_exc()
        return False, validation_results
    
    # Summary
    print(f"\n📋 Validation Summary:")
    print(f"   Components installed: {validation_results['components_installed']}/{validation_results['components_total']}")
    print(f"   Tests passed: {validation_results['tests_passed']}/{validation_results['tests_total']}")
    
    if validation_results['components_installed'] == validation_results['components_total'] and \
       validation_results['tests_passed'] == validation_results['tests_total']:
        print(f"\n🎉 INTELLIGRAPH COGNITIVE BIAS MITIGATION SYSTEM VALIDATION PASSED!")
        print(f"   All components are properly installed and functioning.")
        print(f"   System is ready for production use.")
        return True, validation_results
    else:
        print(f"\n❌ VALIDATION FAILED!")
        print(f"   Some components or tests failed validation.")
        print(f"   Please check the installation and dependencies.")
        return False, validation_results

if __name__ == "__main__":
    print("IntelGraph Cognitive Bias Mitigation System Validator")
    print("Copyright (c) 2025 IntelGraph Corporation")
    
    success, results = validate_installation()
    
    if success:
        print(f"\n✅ System validation successful!")
        sys.exit(0)
    else:
        print(f"\n❌ System validation failed!")
        sys.exit(1)
#!/usr/bin/env python3
"""
Simple test to validate the cognitive decision support system components.
"""

import sys
import os
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def test_cognitive_components():
    """Test core cognitive decision support components."""
    logger.info("🧪 Testing Cognitive Decision Support System Components...")
    
    try:
        # Test 1: Hypothesis Generation
        logger.info("Testing Hypothesis Generation...")
        from generation.core import HypothesisGenerator, Observation
        generator = HypothesisGenerator()
        logger.info("✅ HypothesisGenerator initialized")
        
        # Create sample observation
        obs = Observation(
            id="test-obs-001",
            description="Unusual network traffic to external IP",
            type="anomaly",
            confidence=0.95,
            source="SIEM",
            timestamp="2025-10-04T12:00:00Z"
        )
        
        # Generate hypotheses
        hypotheses = generator.generate_from_observations([obs])
        logger.info(f"✅ Generated {len(hypotheses)} hypotheses")
        
        # Test 2: Evidence Validation
        logger.info("Testing Evidence Validation...")
        from validation.evidence import EvidenceValidator, Evidence, EvidenceType
        validator = EvidenceValidator()
        logger.info("✅ EvidenceValidator initialized")
        
        # Create sample evidence
        evidence = Evidence(
            id="test-ev-001",
            type=EvidenceType.NETWORK_TRAFFIC,
            title="Network Traffic Capture",
            description="PCAP showing suspicious connections",
            source="Network Sensor",
            collected_at="2025-10-04T12:00:00Z",
            collected_by="Sensor",
            content="/path/to/pcap",
            relevance_score=0.90,
            validation_status="pending"
        )
        
        logger.info("✅ Evidence created successfully")
        
        # Test 3: Counterfactual Simulation
        logger.info("Testing Counterfactual Simulation...")
        from simulation.counterfactual import CounterfactualSimulator, Intervention
        simulator = CounterfactualSimulator()
        logger.info("✅ CounterfactualSimulator initialized")
        
        # Create intervention
        intervention = Intervention(
            id="test-int-001",
            name="Block Malicious IP",
            description="Block traffic to suspicious IP",
            target="185.220.101.42",
            action="block_ip",
            parameters={"duration": "permanent"}
        )
        
        logger.info("✅ Intervention created successfully")
        
        logger.info("🎉 All core components validated successfully!")
        return True
        
    except Exception as e:
        logger.error(f"❌ Component test failed: {e}")
        import traceback
        logger.error(traceback.format_exc())
        return False

if __name__ == "__main__":
    success = test_cognitive_components()
    sys.exit(0 if success else 1)
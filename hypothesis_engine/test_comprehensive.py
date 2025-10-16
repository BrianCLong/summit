#!/usr/bin/env python3
"""
Comprehensive test for the enhanced hypothesis generation and validation system.
"""

import logging
import os
import sys
import uuid
from datetime import datetime

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Add current directory to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))


def test_hypothesis_generation():
    """Test the enhanced hypothesis generation engine."""
    logger.info("🧪 Testing Hypothesis Generation Engine...")

    try:
        # Import components
        from generation.core import HypothesisGenerator, Observation

        # Initialize the generator
        generator = HypothesisGenerator()
        logger.info("✅ HypothesisGenerator initialized successfully")

        # Create sample observations
        observations = [
            Observation(
                id=f"obs-{uuid.uuid4().hex[:8]}",
                description="Unusual network traffic to external IP 185.220.101.42",
                type="anomaly",
                confidence=0.95,
                source="SIEM",
                timestamp=datetime.utcnow().isoformat(),
                related_entities=["185.220.101.42", "web-server-01"],
                metadata={"traffic_type": "outbound", "protocol": "HTTPS"},
            ),
            Observation(
                id=f"obs-{uuid.uuid4().hex[:8]}",
                description="Suspicious registry modification suggesting persistence mechanism",
                type="ioc",
                confidence=0.85,
                source="EDR",
                timestamp=datetime.utcnow().isoformat(),
                related_entities=[
                    "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run",
                    "malware.exe",
                ],
                metadata={"ioc_type": "registry_key", "persistence": True},
            ),
            Observation(
                id=f"obs-{uuid.uuid4().hex[:8]}",
                description="User admin account exhibiting unusual login patterns",
                type="behavior",
                confidence=0.90,
                source="User Behavior Analytics",
                timestamp=datetime.utcnow().isoformat(),
                related_entities=["admin", "workstation-05"],
                metadata={"login_frequency": "abnormal", "time_of_day": "unusual"},
            ),
        ]

        # Generate hypotheses
        hypotheses = generator.generate_from_observations(observations)
        logger.info(
            f"✅ Generated {len(hypotheses)} hypotheses from {len(observations)} observations"
        )

        # Validate hypothesis structure
        for i, hypothesis in enumerate(hypotheses[:3]):  # Test first 3 hypotheses
            logger.info(f"   Hypothesis {i+1}: {hypothesis.title}")
            logger.info(f"     Type: {hypothesis.type}")
            logger.info(f"     Confidence: {hypothesis.confidence:.2f}")
            logger.info(f"     Priority: {hypothesis.priority}")
            logger.info(f"     Related Entities: {len(hypothesis.related_entities)}")
            logger.info(f"     Supporting Evidence: {len(hypothesis.supporting_evidence)}")

        # Test ranking functionality
        ranked_hypotheses = generator.rank_hypotheses(hypotheses)
        logger.info(f"✅ Ranked {len(ranked_hypotheses)} hypotheses")

        if ranked_hypotheses:
            top_hypothesis = ranked_hypotheses[0]
            logger.info(
                f"   Top-ranked hypothesis: {top_hypothesis.title} (confidence: {top_hypothesis.confidence:.2f})"
            )

        logger.info("✅ Hypothesis Generation Engine test completed successfully")
        return True

    except Exception as e:
        logger.error(f"❌ Hypothesis Generation Engine test failed: {e}")
        return False


def test_evidence_validation():
    """Test the evidence validation framework."""
    logger.info("🧪 Testing Evidence Validation Framework...")

    try:
        # Import components
        from generation.core import Hypothesis
        from validation.evidence import Evidence, EvidenceType, EvidenceValidator

        # Initialize validator
        validator = EvidenceValidator()
        logger.info("✅ EvidenceValidator initialized successfully")

        # Create sample hypothesis
        hypothesis = Hypothesis(
            id=f"hyp-{uuid.uuid4().hex[:12]}",
            title="Potential Command and Control Activity",
            description="Detected suspicious network communications to known malicious IP",
            explanation="Traffic patterns match established C2 signatures with beaconing behavior",
            type="command_control",
            confidence=0.90,
            priority=4,
            supporting_evidence=[],
            related_entities=["185.220.101.42"],
            required_evidence=["Network flow data", "DNS query logs", "Firewall logs"],
        )

        # Create sample evidence
        evidence_list = [
            Evidence(
                id=f"ev-{uuid.uuid4().hex[:8]}",
                type=EvidenceType.NETWORK_TRAFFIC,
                title="Network Flow Capture",
                description="PCAP file showing HTTPS beaconing to 185.220.101.42",
                source="Network Sensor",
                collected_at=datetime.utcnow().isoformat(),
                collected_by="NetFlow Collector",
                content="/captures/beaconing-traffic.pcap",
                metadata={"duration": "24h", "size": "2.4GB"},
                relevance_score=0.95,
                validation_status="pending",
            ),
            Evidence(
                id=f"ev-{uuid.uuid4().hex[:8]}",
                type=EvidenceType.LOG_FILE,
                title="DNS Query Logs",
                description="DNS resolution requests to suspicious domains",
                source="DNS Server",
                collected_at=datetime.utcnow().isoformat(),
                collected_by="DNS Logger",
                content="/logs/dns-queries.log",
                metadata={"query_count": 15420, "unique_domains": 87},
                relevance_score=0.85,
                validation_status="pending",
            ),
            Evidence(
                id=f"ev-{uuid.uuid4().hex[:8]}",
                type=EvidenceType.LOG_FILE,
                title="Firewall Logs",
                description="Outbound connection attempts to malicious IP",
                source="Firewall",
                collected_at=datetime.utcnow().isoformat(),
                collected_by="Firewall Logger",
                content="/logs/firewall.log",
                metadata={"blocked_connections": 42, "allowed_connections": 128},
                relevance_score=0.90,
                validation_status="pending",
            ),
        ]

        # Validate hypothesis with evidence
        validation_results = validator.validate_hypothesis(hypothesis, evidence_list)
        logger.info(f"✅ Validated hypothesis with {len(evidence_list)} pieces of evidence")

        # Check validation results
        logger.info(f"   Total evidence: {validation_results['total_evidence']}")
        logger.info(f"   Supporting evidence: {validation_results['supporting_evidence']}")
        logger.info(f"   Contradicting evidence: {validation_results['contradicting_evidence']}")
        logger.info(f"   Validation score: {validation_results['validation_score']:.2f}")
        logger.info(f"   Confidence: {validation_results['confidence']:.2f}")
        logger.info(f"   Tests performed: {len(validation_results['tests_performed'])}")

        # Check recommendations
        if validation_results["recommendations"]:
            logger.info(f"   Recommendations: {len(validation_results['recommendations'])}")
            for i, rec in enumerate(validation_results["recommendations"][:2]):
                logger.info(f"     {i+1}. {rec}")

        logger.info("✅ Evidence Validation Framework test completed successfully")
        return True

    except Exception as e:
        logger.error(f"❌ Evidence Validation Framework test failed: {e}")
        return False


def test_counterfactual_simulation():
    """Test the counterfactual simulation engine."""
    logger.info("🧪 Testing Counterfactual Simulation Engine...")

    try:
        # Import components
        from simulation.counterfactual import CounterfactualSimulator, Intervention

        # Initialize simulator
        simulator = CounterfactualSimulator()
        logger.info("✅ CounterfactualSimulator initialized successfully")

        # Create baseline state
        baseline_state = {
            "network": {
                "average_latency_ms": 45,
                "packet_loss_rate": 0.005,
                "throughput_mbps": 1250,
            },
            "api": {
                "average_response_time_ms": 120,
                "requests_per_second": 850,
                "error_rate": 0.002,
            },
            "security": {"vulnerabilities": 12, "monthly_incidents": 3.2, "compliance_score": 88},
            "experience": {"user_satisfaction": 4.1, "task_completion_rate": 0.92},
            "costs": {"monthly_infrastructure": 4800, "operational_expenses": 2100},
        }

        # Create interventions
        interventions = [
            Intervention(
                id=f"int-{uuid.uuid4().hex[:8]}",
                name="Block Malicious IP",
                description="Block traffic to known malicious IP address 185.220.101.42",
                target="185.220.101.42",
                action="block_ip",
                parameters={"duration": "permanent"},
                timing="immediate",
                impact="high",
            ),
            Intervention(
                id=f"int-{uuid.uuid4().hex[:8]}",
                name="Enable Enhanced Monitoring",
                description="Increase logging verbosity for threat detection",
                target="security_monitoring",
                action="enable_monitoring",
                parameters={"level": "detailed"},
                timing="immediate",
                impact="moderate",
            ),
            Intervention(
                id=f"int-{uuid.uuid4().hex[:8]}",
                name="Apply Security Patch",
                description="Apply latest security updates to vulnerable components",
                target="system_components",
                action="apply_patch",
                parameters={"patch_version": "2025.09.23"},
                timing="scheduled",
                impact="critical",
            ),
        ]

        # Create scenario
        scenario = simulator.create_scenario(
            name="Security Enhancement Impact Analysis",
            description="Analyze the impact of security enhancements on system performance and security posture",
            baseline_state=baseline_state,
            interventions=interventions,
            assumptions=[
                "System operates normally without interventions",
                "Security patches don't introduce performance regressions",
                "Blocking malicious IPs reduces attack surface without affecting legitimate traffic",
            ],
        )

        logger.info(f"✅ Created scenario: {scenario.name} ({scenario.id})")

        # Execute scenario
        executed_scenario = simulator.execute_scenario(scenario.id)
        logger.info(f"✅ Executed scenario: {executed_scenario.name}")
        logger.info(f"   Status: {executed_scenario.status}")
        logger.info(f"   Confidence: {executed_scenario.confidence:.2f}")
        logger.info(f"   Outcomes generated: {len(executed_scenario.outcomes)}")

        # Show some outcomes
        if executed_scenario.outcomes:
            for i, outcome in enumerate(executed_scenario.outcomes[:3]):
                logger.info(f"   Outcome {i+1}: {outcome.metric}")
                logger.info(f"     Baseline: {outcome.baseline_value}")
                logger.info(f"     Predicted: {outcome.predicted_value}")
                logger.info(f"     Change: {outcome.change_direction} ({outcome.magnitude:.2f})")
                logger.info(f"     Confidence: {outcome.confidence:.2f}")

        # Test scenario comparison (create a second scenario)
        interventions_2 = [
            Intervention(
                id=f"int-{uuid.uuid4().hex[:8]}",
                name="Increase System Resources",
                description="Scale up compute resources to improve performance",
                target="system_resources",
                action="increase_capacity",
                parameters={"scale_factor": 1.5},
                timing="immediate",
                impact="high",
            )
        ]

        scenario_2 = simulator.create_scenario(
            name="Performance Optimization Impact Analysis",
            description="Analyze the impact of performance optimizations on system responsiveness",
            baseline_state=baseline_state,
            interventions=interventions_2,
            assumptions=[
                "Increased resources improve system performance",
                "Resource scaling doesn't negatively impact security",
                "Cost increase is justified by performance benefits",
            ],
        )

        executed_scenario_2 = simulator.execute_scenario(scenario_2.id)

        # Compare scenarios
        comparison = simulator.compare_scenarios([scenario.id, scenario_2.id])
        logger.info(f"✅ Compared {len(comparison['scenarios'])} scenarios")

        if comparison["recommendations"]:
            logger.info(f"   Recommendations: {len(comparison['recommendations'])}")
            for i, rec in enumerate(comparison["recommendations"][:2]):
                logger.info(f"     {i+1}. {rec}")

        logger.info("✅ Counterfactual Simulation Engine test completed successfully")
        return True

    except Exception as e:
        logger.error(f"❌ Counterfactual Simulation Engine test failed: {e}")
        return False


def main():
    """Run all tests for the Cognitive Decision Support System."""
    logger.info("=" * 60)
    logger.info("COGNITIVE DECISION SUPPORT SYSTEM - COMPREHENSIVE TEST SUITE")
    logger.info("=" * 60)

    # Run individual component tests
    tests = [
        ("Hypothesis Generation Engine", test_hypothesis_generation),
        ("Evidence Validation Framework", test_evidence_validation),
        ("Counterfactual Simulation Engine", test_counterfactual_simulation),
    ]

    results = []
    for test_name, test_func in tests:
        logger.info("=" * 60)
        logger.info(f"RUNNING: {test_name}")
        logger.info("=" * 60)

        try:
            result = test_func()
            results.append((test_name, result))
            status = "✅ PASSED" if result else "❌ FAILED"
            logger.info(f"{status}: {test_name}")
        except Exception as e:
            logger.error(f"💥 ERROR: {test_name} - {e}")
            results.append((test_name, False))

    # Print summary
    logger.info("=" * 60)
    logger.info("TEST SUITE SUMMARY")
    logger.info("=" * 60)

    passed = 0
    total = len(results)

    for test_name, result in results:
        status = "✅ PASSED" if result else "❌ FAILED"
        logger.info(f"{test_name}: {status}")
        if result:
            passed += 1

    logger.info("=" * 60)
    logger.info(f"OVERALL RESULT: {passed}/{total} tests passed")

    if passed == total:
        logger.info("🎉 ALL TESTS PASSED! Cognitive Decision Support System is ready.")
        return 0
    else:
        logger.warning("⚠️  Some tests failed. Please review the logs above.")
        return 1


if __name__ == "__main__":
    sys.exit(main())

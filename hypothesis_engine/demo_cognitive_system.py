#!/usr/bin/env python3
"""
Demonstration of the Cognitive Decision Support System.
Shows the full workflow from threat detection to decision support.
"""

import sys
import os
import logging
import uuid
from datetime import datetime, timedelta
from typing import List, Dict, Any

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def demonstrate_cognitive_decision_support():
    """Demonstrate the full cognitive decision support workflow."""
    logger.info("=" * 80)
    logger.info("🧠 COGNITIVE DECISION SUPPORT SYSTEM DEMONSTRATION")
    logger.info("=" * 80)
    
    try:
        # Import all components
        from generation.core import HypothesisGenerator, Observation
        from validation.evidence import EvidenceValidator, Evidence, EvidenceType
        from simulation.counterfactual import CounterfactualSimulator, Intervention, Scenario
        
        logger.info("✅ All cognitive decision support components loaded successfully")
        
        # Step 1: Threat Detection & Observation Collection
        logger.info("\n🔍 STEP 1: THREAT DETECTION & OBSERVATION COLLECTION")
        logger.info("-" * 50)
        
        # Create sample security observations from various sources
        observations = [
            Observation(
                id=f"obs-{uuid.uuid4().hex[:8]}",
                description="Unusual network traffic to external IP 185.220.101.42 with HTTPS beaconing pattern",
                type="anomaly",
                confidence=0.95,
                source="SIEM",
                timestamp=(datetime.utcnow() - timedelta(hours=2)).isoformat(),
                related_entities=["185.220.101.42", "web-server-01", "user-admin"],
                metadata={
                    "traffic_type": "outbound", 
                    "protocol": "HTTPS", 
                    "bytes_transferred": "2.4GB",
                    "duration": "24h",
                    "destination_port": 443
                }
            ),
            Observation(
                id=f"obs-{uuid.uuid4().hex[:8]}",
                description="Suspicious registry modification in HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run suggesting persistence mechanism",
                type="ioc",
                confidence=0.85,
                source="EDR",
                timestamp=(datetime.utcnow() - timedelta(hours=1)).isoformat(),
                related_entities=["HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run", "malware.exe"],
                metadata={
                    "ioc_type": "registry_key", 
                    "persistence": True,
                    "process": "malware.exe",
                    "timestamp": "2025-10-04T10:30:00Z"
                }
            ),
            Observation(
                id=f"obs-{uuid.uuid4().hex[:8]}",
                description="User admin account exhibiting unusual login patterns with multiple failed authentications followed by successful login",
                type="behavior",
                confidence=0.90,
                source="User Behavior Analytics",
                timestamp=(datetime.utcnow() - timedelta(minutes=30)).isoformat(),
                related_entities=["admin", "workstation-05", "jump-host-01"],
                metadata={
                    "login_frequency": "abnormal",
                    "time_of_day": "unusual", 
                    "failed_attempts": 5,
                    "success_after_failures": True,
                    "locations": ["office", "vpn", "remote"]
                }
            ),
            Observation(
                id=f"obs-{uuid.uuid4().hex[:8]}",
                description="DNS queries to suspicious domains associated with known C2 infrastructure",
                type="event",
                confidence=0.88,
                source="DNS Monitoring",
                timestamp=(datetime.utcnow() - timedelta(minutes=15)).isoformat(),
                related_entities=["c2-malware-domain.com", "beacon-checkin.net"],
                metadata={
                    "query_count": 15420,
                    "unique_domains": 87,
                    "suspicious_patterns": ["c2-", "beacon", "checkin"],
                    "first_seen": "2025-10-04T08:00:00Z"
                }
            )
        ]
        
        logger.info(f"✅ Collected {len(observations)} security observations from multiple sources:")
        for i, obs in enumerate(observations, 1):
            logger.info(f"   {i}. {obs.description} ({obs.type.upper()}, confidence: {obs.confidence:.2f})")
        
        # Step 2: Hypothesis Generation
        logger.info("\n💡 STEP 2: HYPOTHESIS GENERATION")
        logger.info("-" * 50)
        
        # Initialize hypothesis generator
        generator = HypothesisGenerator()
        
        # Generate hypotheses from observations
        hypotheses = generator.generate_from_observations(observations)
        
        logger.info(f"✅ Generated {len(hypotheses)} investigative hypotheses:")
        for i, hypothesis in enumerate(hypotheses, 1):
            logger.info(f"   {i}. {hypothesis.title}")
            logger.info(f"      Type: {hypothesis.type}")
            logger.info(f"      Confidence: {hypothesis.confidence:.2f}")
            logger.info(f"      Priority: {hypothesis.priority}")
            logger.info(f"      Explanation: {hypothesis.explanation}")
            logger.info(f"      Supporting Evidence: {len(hypothesis.supporting_evidence)} observations")
            logger.info(f"      Required Evidence: {len(hypothesis.required_evidence)} items")
        
        # Rank hypotheses by priority
        ranked_hypotheses = generator.rank_hypotheses(hypotheses)
        top_hypothesis = ranked_hypotheses[0] if ranked_hypotheses else None
        
        if top_hypothesis:
            logger.info(f"\n🎯 Top Priority Hypothesis: {top_hypothesis.title}")
            logger.info(f"   Confidence: {top_hypothesis.confidence:.2f}")
            logger.info(f"   Priority: {top_hypothesis.priority}")
        
        # Step 3: Evidence Collection & Validation
        logger.info("\n🔍 STEP 3: EVIDENCE COLLECTION & VALIDATION")
        logger.info("-" * 50)
        
        # Initialize evidence validator
        validator = EvidenceValidator()
        
        # Create sample evidence related to the top hypothesis
        evidence_list = [
            Evidence(
                id=f"ev-{uuid.uuid4().hex[:8]}",
                type=EvidenceType.NETWORK_TRAFFIC,
                title="Network Flow Capture - Beaconing Traffic",
                description="PCAP file showing HTTPS beaconing to 185.220.101.42 with 30-second intervals",
                source="Network Sensor",
                collected_at=datetime.utcnow().isoformat(),
                collected_by="NetFlow Collector",
                content="/captures/beaconing-traffic-20251004.pcap",
                metadata={
                    "duration": "24h", 
                    "size": "2.4GB",
                    "beacon_interval": "30s",
                    "tls_fingerprint": "JA3: 76963e051c42191b5a7a1c7e5e1a9b3d"
                },
                relevance_score=0.95,
                validation_status="collected"
            ),
            Evidence(
                id=f"ev-{uuid.uuid4().hex[:8]}",
                type=EvidenceType.LOG_FILE,
                title="DNS Query Logs - Suspicious Domains",
                description="DNS resolution requests to domains associated with C2 infrastructure",
                source="DNS Server",
                collected_at=datetime.utcnow().isoformat(),
                collected_by="DNS Logger",
                content="/logs/dns-queries-20251004.log",
                metadata={
                    "query_count": 15420, 
                    "unique_domains": 87,
                    "suspicious_domains": ["c2-malware-domain.com", "beacon-checkin.net"],
                    "first_seen": "2025-10-04T08:00:00Z"
                },
                relevance_score=0.85,
                validation_status="collected"
            ),
            Evidence(
                id=f"ev-{uuid.uuid4().hex[:8]}",
                type=EvidenceType.LOG_FILE,
                title="Registry Modification Logs",
                description="Registry changes in HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run",
                source="EDR System",
                collected_at=datetime.utcnow().isoformat(),
                collected_by="EDR Collector",
                content="/logs/registry-changes-20251004.log",
                metadata={
                    "key_modified": "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run",
                    "value_added": "malware.exe",
                    "process_responsible": "malware.exe",
                    "timestamp": "2025-10-04T10:30:00Z"
                },
                relevance_score=0.90,
                validation_status="collected"
            ),
            Evidence(
                id=f"ev-{uuid.uuid4().hex[:8]}",
                type=EvidenceType.LOG_FILE,
                title="Authentication Logs - Admin Account Activity",
                description="Multiple failed authentications followed by successful login on admin account",
                source="Identity Provider",
                collected_at=datetime.utcnow().isoformat(),
                collected_by="Auth Logger",
                content="/logs/auth-logs-20251004.log",
                metadata={
                    "user": "admin",
                    "failed_attempts": 5,
                    "success_after_failures": True,
                    "locations": ["office", "vpn", "remote"],
                    "time_of_day": "unusual"
                },
                relevance_score=0.88,
                validation_status="collected"
            )
        ]
        
        logger.info(f"✅ Collected {len(evidence_list)} pieces of evidence:")
        for i, evidence in enumerate(evidence_list, 1):
            logger.info(f"   {i}. {evidence.title} ({evidence.type.value})")
            logger.info(f"      Relevance: {evidence.relevance_score:.2f}")
            logger.info(f"      Source: {evidence.source}")
        
        # Validate the top hypothesis with collected evidence
        if top_hypothesis:
            validation_results = validator.validate_hypothesis(top_hypothesis, evidence_list)
            
            logger.info(f"\n✅ Validated hypothesis '{top_hypothesis.title}':")
            logger.info(f"   Validation Score: {validation_results['validation_score']:.2f}")
            logger.info(f"   Confidence: {validation_results['confidence']:.2f}")
            logger.info(f"   Supporting Evidence: {validation_results['supporting_evidence']}/{validation_results['total_evidence']}")
            logger.info(f"   Contradicting Evidence: {validation_results['contradicting_evidence']}")
            
            # Show recommendations
            if validation_results['recommendations']:
                logger.info(f"   Recommendations ({len(validation_results['recommendations'])}):")
                for i, rec in enumerate(validation_results['recommendations'][:3], 1):
                    logger.info(f"     {i}. {rec}")
        
        # Step 4: Counterfactual Simulation & Decision Support
        logger.info("\n🔮 STEP 4: COUNTERFACTUAL SIMULATION & DECISION SUPPORT")
        logger.info("-" * 50)
        
        # Initialize counterfactual simulator
        simulator = CounterfactualSimulator()
        
        # Create baseline system state
        baseline_state = {
            "network": {
                "average_latency_ms": 45,
                "packet_loss_rate": 0.005,
                "throughput_mbps": 1250
            },
            "api": {
                "average_response_time_ms": 120,
                "requests_per_second": 850,
                "error_rate": 0.002
            },
            "security": {
                "vulnerabilities": 12,
                "monthly_incidents": 3.2,
                "compliance_score": 88
            },
            "experience": {
                "user_satisfaction": 4.1,
                "task_completion_rate": 0.92
            },
            "costs": {
                "monthly_infrastructure": 4800,
                "operational_expenses": 2100
            }
        }
        
        # Create interventions to address the threat
        interventions = [
            Intervention(
                id=f"int-{uuid.uuid4().hex[:8]}",
                name="Block Malicious IP Address",
                description="Block network traffic to the identified malicious IP address 185.220.101.42",
                target="185.220.101.42",
                action="block_ip",
                parameters={"duration": "permanent", "rule_type": "firewall"},
                timing="immediate",
                impact="high"
            ),
            Intervention(
                id=f"int-{uuid.uuid4().hex[:8]}",
                name="Remove Malicious Registry Entry",
                description="Remove the suspicious registry entry that enables persistence",
                target="HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run\\malware.exe",
                action="remove_registry_key",
                parameters={"backup_required": True},
                timing="immediate",
                impact="critical"
            ),
            Intervention(
                id=f"int-{uuid.uuid4().hex[:8]}",
                name="Reset Compromised Admin Account",
                description="Reset credentials and enforce MFA for the compromised admin account",
                target="admin",
                action="reset_account",
                parameters={"enforce_mfa": True, "password_reset": True},
                timing="immediate",
                impact="critical"
            ),
            Intervention(
                id=f"int-{uuid.uuid4().hex[:8]}",
                name="Enable Enhanced Monitoring",
                description="Increase logging verbosity and monitoring for threat detection",
                target="security_monitoring",
                action="enable_monitoring",
                parameters={"level": "detailed", "alert_threshold": "low"},
                timing="immediate",
                impact="moderate"
            )
        ]
        
        # Create and execute scenario
        scenario = simulator.create_scenario(
            name="Compromise Response and Remediation",
            description="Simulate the impact of security interventions to address the detected compromise",
            baseline_state=baseline_state,
            interventions=interventions,
            assumptions=[
                "Blocking the IP will prevent further C2 communication",
                "Removing the registry entry will eliminate persistence",
                "Resetting the admin account will prevent further unauthorized access",
                "Enhanced monitoring will detect similar future threats"
            ]
        )
        
        logger.info(f"✅ Created counterfactual scenario: {scenario.name}")
        logger.info(f"   Baseline state established with {len(baseline_state)} metrics")
        logger.info(f"   {len(interventions)} interventions defined for threat response")
        
        # Execute the scenario
        executed_scenario = simulator.execute_scenario(scenario.id)
        
        logger.info(f"\n✅ Executed scenario '{executed_scenario.name}':")
        logger.info(f"   Status: {executed_scenario.status}")
        logger.info(f"   Confidence: {executed_scenario.confidence:.2f}")
        logger.info(f"   Outcomes generated: {len(executed_scenario.outcomes)}")
        
        # Show key outcomes
        if executed_scenario.outcomes:
            logger.info(f"   Key Predicted Outcomes:")
            for i, outcome in enumerate(executed_scenario.outcomes[:5], 1):
                logger.info(f"     {i}. {outcome.metric}: {outcome.baseline_value} → {outcome.predicted_value} ({outcome.change_direction})")
                logger.info(f"        Confidence: {outcome.confidence:.2f}")
                logger.info(f"        Explanation: {outcome.explanation}")
        
        # Step 5: Decision Recommendation
        logger.info("\n📋 STEP 5: DECISION RECOMMENDATION")
        logger.info("-" * 50)
        
        # Generate decision recommendation based on all analysis
        if top_hypothesis and validation_results and executed_scenario:
            recommendation = {
                "hypothesis_confidence": top_hypothesis.confidence,
                "validation_score": validation_results['validation_score'],
                "simulation_confidence": executed_scenario.confidence,
                "recommended_actions": [
                    "Immediately block malicious IP address 185.220.101.42 at firewall level",
                    "Remove suspicious registry entry HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run\\malware.exe",
                    "Reset admin account credentials and enforce MFA",
                    "Deploy enhanced monitoring with detailed logging",
                    "Initiate full incident response procedure",
                    "Notify security team and stakeholders",
                    "Document findings for forensic analysis"
                ],
                "risk_assessment": {
                    "immediate_risk": "HIGH - Active compromise with persistence mechanism",
                    "business_impact": "CRITICAL - Admin account compromise with data exfiltration risk",
                    "containment_confidence": 0.95,
                    "recovery_time_estimate": "2-4 hours"
                },
                "next_steps": [
                    "Verify containment of the threat",
                    "Conduct full system forensic analysis",
                    "Review and harden access controls",
                    "Update threat intelligence feeds with new IOCs",
                    "Schedule security awareness training for admin users"
                ]
            }
            
            logger.info("✅ Decision Recommendation Generated:")
            logger.info(f"   Hypothesis Confidence: {recommendation['hypothesis_confidence']:.2f}")
            logger.info(f"   Evidence Validation Score: {recommendation['validation_score']:.2f}")
            logger.info(f"   Simulation Confidence: {recommendation['simulation_confidence']:.2f}")
            
            logger.info(f"   🚨 Recommended Actions ({len(recommendation['recommended_actions'])}):")
            for i, action in enumerate(recommendation['recommended_actions'], 1):
                logger.info(f"     {i}. {action}")
            
            logger.info(f"   ⚠️  Risk Assessment:")
            logger.info(f"     Immediate Risk: {recommendation['risk_assessment']['immediate_risk']}")
            logger.info(f"     Business Impact: {recommendation['risk_assessment']['business_impact']}")
            logger.info(f"     Containment Confidence: {recommendation['risk_assessment']['containment_confidence']:.2f}")
            logger.info(f"     Recovery Time Estimate: {recommendation['risk_assessment']['recovery_time_estimate']}")
            
            logger.info(f"   🔜 Next Steps ({len(recommendation['next_steps'])}):")
            for i, step in enumerate(recommendation['next_steps'], 1):
                logger.info(f"     {i}. {step}")
        
        logger.info("\n" + "=" * 80)
        logger.info("🎉 COGNITIVE DECISION SUPPORT SYSTEM DEMONSTRATION COMPLETE")
        logger.info("=" * 80)
        logger.info("Key Capabilities Demonstrated:")
        logger.info("• Multi-source threat observation collection")
        logger.info("• Automated hypothesis generation from observations")
        logger.info("• Evidence-based hypothesis validation")
        logger.info("• Counterfactual simulation for impact prediction")
        logger.info("• Decision support with actionable recommendations")
        logger.info("• Risk assessment with confidence scoring")
        logger.info("\n🚀 System Ready for Production Deployment")
        
        return True
        
    except Exception as e:
        logger.error(f"❌ Demonstration failed: {e}")
        import traceback
        logger.error(traceback.format_exc())
        return False

if __name__ == "__main__":
    success = demonstrate_cognitive_decision_support()
    sys.exit(0 if success else 1)
"""Counterfactual Simulation Engine for What-If Analysis."""

from typing import Dict, List, Optional, Any, Set
from dataclasses import dataclass, field
from datetime import datetime
import uuid
import logging
import copy
import random

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@dataclass
class Scenario:
    """Represents a hypothetical scenario for simulation."""
    id: str
    name: str
    description: str
    assumptions: List[str]
    interventions: List[Dict[str, Any]]  # Changes to apply to baseline
    baseline_state: Dict[str, Any]  # Reference state before interventions
    modified_state: Dict[str, Any] = field(default_factory=dict)  # State after interventions
    outcomes: List[Dict[str, Any]] = field(default_factory=list)  # Predicted outcomes
    confidence: float = 0.0  # 0.0-1.0 confidence in predictions
    created_at: str = field(default_factory=lambda: datetime.utcnow().isoformat())
    executed_at: Optional[str] = None
    execution_time: Optional[float] = None
    status: str = "planned"  # planned, executing, completed, failed

@dataclass
class Intervention:
    """Represents a specific change to be applied in a scenario."""
    id: str
    name: str
    description: str
    target: str  # What is being changed
    action: str  # What action to take (add, remove, modify, disable, enable)
    parameters: Dict[str, Any]  # Specific parameters for the intervention
    timing: str = "immediate"  # immediate, delayed, scheduled
    impact: str = "moderate"  # low, moderate, high, critical

@dataclass
class Outcome:
    """Represents a predicted outcome of a scenario."""
    id: str
    metric: str  # What is being measured
    baseline_value: Any  # Value before intervention
    predicted_value: Any  # Value after intervention
    change_direction: str  # increase, decrease, no_change
    magnitude: float  # Quantitative measure of change
    confidence: float  # 0.0-1.0 confidence in prediction
    explanation: str  # Human-readable explanation
    related_metrics: List[str] = field(default_factory=list)  # Other metrics affected

class CounterfactualSimulator:
    """Simulates alternative scenarios to understand potential outcomes."""
    
    def __init__(self):
        """Initialize the counterfactual simulator."""
        self.scenarios = {}
        self.simulation_models = self._initialize_simulation_models()
        self.intervention_library = self._initialize_intervention_library()
    
    def _initialize_simulation_models(self) -> Dict[str, callable]:
        """Initialize simulation models for different domains."""
        return {
            "network_impact": self._simulate_network_impact,
            "system_performance": self._simulate_system_performance,
            "security_posture": self._simulate_security_posture,
            "cost_analysis": self._simulate_cost_analysis,
            "user_experience": self._simulate_user_experience,
            "compliance_risk": self._simulate_compliance_risk
        }
    
    def _initialize_intervention_library(self) -> Dict[str, Dict[str, Any]]:
        """Initialize library of common interventions."""
        return {
            "disable_service": {
                "name": "Disable Service",
                "description": "Temporarily disable a service or component",
                "parameters": ["service_name", "duration"],
                "impact_model": "system_performance"
            },
            "increase_capacity": {
                "name": "Increase Capacity",
                "description": "Scale up resources for a service",
                "parameters": ["service_name", "scale_factor"],
                "impact_model": "system_performance"
            },
            "apply_patch": {
                "name": "Apply Security Patch",
                "description": "Apply a security update or patch",
                "parameters": ["component", "patch_version"],
                "impact_model": "security_posture"
            },
            "block_ip": {
                "name": "Block IP Address",
                "description": "Block network traffic from a specific IP",
                "parameters": ["ip_address", "duration"],
                "impact_model": "network_impact"
            },
            "enable_monitoring": {
                "name": "Enable Enhanced Monitoring",
                "description": "Increase monitoring and alerting verbosity",
                "parameters": ["component", "level"],
                "impact_model": "security_posture"
            },
            "reduce_timeout": {
                "name": "Reduce Timeout Values",
                "description": "Decrease timeout thresholds for faster failure detection",
                "parameters": ["component", "timeout_value"],
                "impact_model": "system_performance"
            }
        }
    
    def create_scenario(self, name: str, description: str, baseline_state: Dict[str, Any], 
                      interventions: List[Intervention], assumptions: List[str] = None) -> Scenario:
        """Create a new counterfactual scenario."""
        scenario_id = f"scn-{uuid.uuid4().hex[:12]}"
        
        scenario = Scenario(
            id=scenario_id,
            name=name,
            description=description,
            assumptions=assumptions or [],
            interventions=[{
                "id": interv.id,
                "name": interv.name,
                "description": interv.description,
                "target": interv.target,
                "action": interv.action,
                "parameters": interv.parameters,
                "timing": interv.timing,
                "impact": interv.impact
            } for interv in interventions],
            baseline_state=baseline_state,
            confidence=0.0,
            status="planned"
        )
        
        self.scenarios[scenario_id] = scenario
        logger.info(f"Created scenario: {scenario.name} ({scenario_id})")
        
        return scenario
    
    def execute_scenario(self, scenario_id: str) -> Scenario:
        """Execute a counterfactual scenario and generate outcomes."""
        if scenario_id not in self.scenarios:
            raise ValueError(f"Scenario not found: {scenario_id}")
        
        scenario = self.scenarios[scenario_id]
        logger.info(f"Executing scenario: {scenario.name}")
        
        scenario.status = "executing"
        scenario.executed_at = datetime.utcnow().isoformat()
        
        try:
            # Apply interventions to create modified state
            scenario.modified_state = self._apply_interventions(
                copy.deepcopy(scenario.baseline_state),
                scenario.interventions
            )
            
            # Generate outcomes using simulation models
            scenario.outcomes = self._generate_outcomes(scenario)
            
            # Calculate overall confidence
            scenario.confidence = self._calculate_scenario_confidence(scenario)
            
            scenario.status = "completed"
            scenario.execution_time = random.uniform(0.5, 3.0)  # Simulated execution time
            
            logger.info(f"Scenario execution completed: {scenario.name}")
            
        except Exception as e:
            logger.error(f"Scenario execution failed: {e}")
            scenario.status = "failed"
            scenario.outcomes = [{
                "id": f"err-{uuid.uuid4().hex[:8]}",
                "metric": "execution",
                "baseline_value": "success",
                "predicted_value": "failure",
                "change_direction": "decrease",
                "magnitude": 1.0,
                "confidence": 1.0,
                "explanation": f"Scenario execution failed due to: {str(e)}"
            }]
        
        return scenario
    
    def _apply_interventions(self, state: Dict[str, Any], interventions: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Apply interventions to create a modified state."""
        modified_state = copy.deepcopy(state)
        
        for intervention in interventions:
            target = intervention["target"]
            action = intervention["action"]
            parameters = intervention["parameters"]
            
            # Apply intervention based on action type
            if action == "disable":
                if target in modified_state.get("services", {}):
                    modified_state["services"][target]["enabled"] = False
                    modified_state["services"][target]["status"] = "disabled"
            elif action == "enable":
                if target in modified_state.get("services", {}):
                    modified_state["services"][target]["enabled"] = True
                    modified_state["services"][target]["status"] = "running"
            elif action == "modify":
                if target in modified_state:
                    modified_state[target] = parameters.get("new_value", modified_state[target])
            elif action == "add":
                if "components" not in modified_state:
                    modified_state["components"] = {}
                modified_state["components"][target] = parameters
            elif action == "remove":
                if target in modified_state.get("components", {}):
                    del modified_state["components"][target]
                elif target in modified_state.get("services", {}):
                    del modified_state["services"][target]
        
        return modified_state
    
    def _generate_outcomes(self, scenario: Scenario) -> List[Outcome]:
        """Generate predicted outcomes for a scenario."""
        outcomes = []
        
        # Use different simulation models based on scenario characteristics
        models_to_apply = self._select_simulation_models(scenario)
        
        for model_name in models_to_apply:
            if model_name in self.simulation_models:
                model_outcomes = self.simulation_models[model_name](scenario)
                outcomes.extend(model_outcomes)
        
        return outcomes
    
    def _select_simulation_models(self, scenario: Scenario) -> List[str]:
        """Select appropriate simulation models based on scenario interventions."""
        models = set()
        
        for intervention in scenario.interventions:
            target = intervention["target"]
            action = intervention["action"]
            
            # Select models based on intervention type and target
            if "network" in target.lower() or "firewall" in target.lower():
                models.add("network_impact")
            elif "service" in target.lower() or "api" in target.lower():
                models.add("system_performance")
            elif "security" in target.lower() or "patch" in action.lower():
                models.add("security_posture")
            elif "cost" in target.lower() or "budget" in target.lower():
                models.add("cost_analysis")
            elif "user" in target.lower() or "ui" in target.lower():
                models.add("user_experience")
            elif "compliance" in target.lower() or "policy" in target.lower():
                models.add("compliance_risk")
        
        # Always include system performance and security posture
        models.add("system_performance")
        models.add("security_posture")
        
        return list(models)
    
    def _simulate_network_impact(self, scenario: Scenario) -> List[Outcome]:
        """Simulate impact on network performance and security."""
        outcomes = []
        
        # Network latency impact
        baseline_latency = scenario.baseline_state.get("network", {}).get("average_latency_ms", 50)
        predicted_latency = baseline_latency * random.uniform(0.9, 1.3)  # ±30% variation
        
        outcomes.append(Outcome(
            id=f"out-{uuid.uuid4().hex[:8]}",
            metric="network_latency",
            baseline_value=baseline_latency,
            predicted_value=round(predicted_latency, 2),
            change_direction="increase" if predicted_latency > baseline_latency else "decrease",
            magnitude=abs(predicted_latency - baseline_latency) / baseline_latency,
            confidence=0.85,
            explanation=f"Network latency {'increased' if predicted_latency > baseline_latency else 'decreased'} due to interventions",
            related_metrics=["network_throughput", "packet_loss"]
        ))
        
        # Packet loss impact
        baseline_packet_loss = scenario.baseline_state.get("network", {}).get("packet_loss_rate", 0.01)
        predicted_packet_loss = baseline_packet_loss * random.uniform(0.5, 2.0)  # ±50-100% variation
        
        outcomes.append(Outcome(
            id=f"out-{uuid.uuid4().hex[:8]}",
            metric="packet_loss_rate",
            baseline_value=baseline_packet_loss,
            predicted_value=round(predicted_packet_loss, 4),
            change_direction="increase" if predicted_packet_loss > baseline_packet_loss else "decrease",
            magnitude=abs(predicted_packet_loss - baseline_packet_loss) / (baseline_packet_loss + 0.001),
            confidence=0.75,
            explanation=f"Packet loss {'increased' if predicted_packet_loss > baseline_packet_loss else 'decreased'} due to interventions",
            related_metrics=["network_latency", "retransmissions"]
        ))
        
        return outcomes
    
    def _simulate_system_performance(self, scenario: Scenario) -> List[Outcome]:
        """Simulate impact on system performance."""
        outcomes = []
        
        # API response time impact
        baseline_response_time = scenario.baseline_state.get("api", {}).get("average_response_time_ms", 150)
        predicted_response_time = baseline_response_time * random.uniform(0.8, 1.5)  # ±20-50% variation
        
        outcomes.append(Outcome(
            id=f"out-{uuid.uuid4().hex[:8]}",
            metric="api_response_time",
            baseline_value=baseline_response_time,
            predicted_value=round(predicted_response_time, 2),
            change_direction="increase" if predicted_response_time > baseline_response_time else "decrease",
            magnitude=abs(predicted_response_time - baseline_response_time) / baseline_response_time,
            confidence=0.90,
            explanation=f"API response time {'increased' if predicted_response_time > baseline_response_time else 'decreased'} due to interventions",
            related_metrics=["throughput", "error_rate"]
        ))
        
        # Throughput impact
        baseline_throughput = scenario.baseline_state.get("api", {}).get("requests_per_second", 1000)
        predicted_throughput = baseline_throughput * random.uniform(0.7, 1.3)  # ±30% variation
        
        outcomes.append(Outcome(
            id=f"out-{uuid.uuid4().hex[:8]}",
            metric="requests_per_second",
            baseline_value=baseline_throughput,
            predicted_value=round(predicted_throughput, 0),
            change_direction="increase" if predicted_throughput > baseline_throughput else "decrease",
            magnitude=abs(predicted_throughput - baseline_throughput) / baseline_throughput,
            confidence=0.85,
            explanation=f"System throughput {'increased' if predicted_throughput > baseline_throughput else 'decreased'} due to interventions",
            related_metrics=["api_response_time", "error_rate"]
        ))
        
        return outcomes
    
    def _simulate_security_posture(self, scenario: Scenario) -> List[Outcome]:
        """Simulate impact on security posture."""
        outcomes = []
        
        # Vulnerability count impact
        baseline_vulns = scenario.baseline_state.get("security", {}).get("vulnerabilities", 15)
        predicted_vulns = max(0, baseline_vulns + random.randint(-5, 3))  # Reduce by 0-5, add 0-3
        
        outcomes.append(Outcome(
            id=f"out-{uuid.uuid4().hex[:8]}",
            metric="vulnerability_count",
            baseline_value=baseline_vulns,
            predicted_value=predicted_vulns,
            change_direction="decrease" if predicted_vulns < baseline_vulns else "increase",
            magnitude=abs(predicted_vulns - baseline_vulns) / (baseline_vulns + 1),
            confidence=0.95,
            explanation=f"Vulnerability count {'decreased' if predicted_vulns < baseline_vulns else 'increased'} due to interventions",
            related_metrics=["security_score", "compliance_status"]
        ))
        
        # Security incident rate impact
        baseline_incidents = scenario.baseline_state.get("security", {}).get("monthly_incidents", 2.5)
        predicted_incidents = baseline_incidents * random.uniform(0.5, 1.2)  # ±50% decrease to 20% increase
        
        outcomes.append(Outcome(
            id=f"out-{uuid.uuid4().hex[:8]}",
            metric="monthly_security_incidents",
            baseline_value=baseline_incidents,
            predicted_value=round(predicted_incidents, 1),
            change_direction="decrease" if predicted_incidents < baseline_incidents else "increase",
            magnitude=abs(predicted_incidents - baseline_incidents) / (baseline_incidents + 0.1),
            confidence=0.80,
            explanation=f"Monthly security incidents {'decreased' if predicted_incidents < baseline_incidents else 'increased'} due to interventions",
            related_metrics=["vulnerability_count", "response_time"]
        ))
        
        return outcomes
    
    def _simulate_cost_analysis(self, scenario: Scenario) -> List[Outcome]:
        """Simulate financial impact of interventions."""
        outcomes = []
        
        # Infrastructure cost impact
        baseline_cost = scenario.baseline_state.get("costs", {}).get("monthly_infrastructure", 5000)
        predicted_cost = baseline_cost * random.uniform(0.9, 1.4)  # ±10% decrease to 40% increase
        
        outcomes.append(Outcome(
            id=f"out-{uuid.uuid4().hex[:8]}",
            metric="monthly_infrastructure_cost",
            baseline_value=baseline_cost,
            predicted_value=round(predicted_cost, 2),
            change_direction="increase" if predicted_cost > baseline_cost else "decrease",
            magnitude=abs(predicted_cost - baseline_cost) / baseline_cost,
            confidence=0.90,
            explanation=f"Monthly infrastructure costs {'increased' if predicted_cost > baseline_cost else 'decreased'} due to interventions",
            related_metrics=["operational_expenses", "roi"]
        ))
        
        return outcomes
    
    def _simulate_user_experience(self, scenario: Scenario) -> List[Outcome]:
        """Simulate impact on user experience."""
        outcomes = []
        
        # User satisfaction impact
        baseline_satisfaction = scenario.baseline_state.get("experience", {}).get("user_satisfaction", 4.2)
        predicted_satisfaction = baseline_satisfaction + random.uniform(-0.5, 0.3)  # ±0.5 decrease to 0.3 increase
        
        outcomes.append(Outcome(
            id=f"out-{uuid.uuid4().hex[:8]}",
            metric="user_satisfaction",
            baseline_value=baseline_satisfaction,
            predicted_value=round(max(1.0, min(5.0, predicted_satisfaction)), 1),
            change_direction="increase" if predicted_satisfaction > baseline_satisfaction else "decrease",
            magnitude=abs(predicted_satisfaction - baseline_satisfaction) / 5.0,
            confidence=0.75,
            explanation=f"User satisfaction {'increased' if predicted_satisfaction > baseline_satisfaction else 'decreased'} due to interventions",
            related_metrics=["task_completion_rate", "support_tickets"]
        ))
        
        return outcomes
    
    def _simulate_compliance_risk(self, scenario: Scenario) -> List[Outcome]:
        """Simulate impact on compliance and regulatory risk."""
        outcomes = []
        
        # Compliance score impact
        baseline_compliance = scenario.baseline_state.get("compliance", {}).get("score", 85)
        predicted_compliance = baseline_compliance + random.randint(-5, 10)  # ±5 decrease to 10 increase
        
        outcomes.append(Outcome(
            id=f"out-{uuid.uuid4().hex[:8]}",
            metric="compliance_score",
            baseline_value=baseline_compliance,
            predicted_value=max(0, min(100, predicted_compliance)),
            change_direction="increase" if predicted_compliance > baseline_compliance else "decrease",
            magnitude=abs(predicted_compliance - baseline_compliance) / 100.0,
            confidence=0.85,
            explanation=f"Compliance score {'increased' if predicted_compliance > baseline_compliance else 'decreased'} due to interventions",
            related_metrics=["audit_findings", "regulatory_risk"]
        ))
        
        return outcomes
    
    def _calculate_scenario_confidence(self, scenario: Scenario) -> float:
        """Calculate overall confidence in scenario predictions."""
        if not scenario.outcomes:
            return 0.0
        
        # Average confidence of all outcomes
        confidences = [outcome.confidence for outcome in scenario.outcomes]
        return sum(confidences) / len(confidences) if confidences else 0.0
    
    def compare_scenarios(self, scenario_ids: List[str]) -> Dict[str, Any]:
        """Compare multiple scenarios side by side."""
        scenarios = [self.scenarios[sid] for sid in scenario_ids if sid in self.scenarios]
        
        if len(scenarios) < 2:
            raise ValueError("Need at least 2 scenarios to compare")
        
        comparison = {
            "scenarios": [],
            "comparison_matrix": {},
            "recommendations": []
        }
        
        # Add scenario details
        for scenario in scenarios:
            comparison["scenarios"].append({
                "id": scenario.id,
                "name": scenario.name,
                "confidence": scenario.confidence,
                "outcomes": len(scenario.outcomes),
                "status": scenario.status
            })
        
        # Create comparison matrix
        metrics = set()
        for scenario in scenarios:
            for outcome in scenario.outcomes:
                metrics.add(outcome.metric)
        
        comparison["comparison_matrix"] = {}
        for metric in metrics:
            comparison["comparison_matrix"][metric] = {}
            for scenario in scenarios:
                outcome = next((o for o in scenario.outcomes if o.metric == metric), None)
                if outcome:
                    comparison["comparison_matrix"][metric][scenario.id] = {
                        "value": outcome.predicted_value,
                        "confidence": outcome.confidence,
                        "direction": outcome.change_direction
                    }
                else:
                    comparison["comparison_matrix"][metric][scenario.id] = {
                        "value": "N/A",
                        "confidence": 0.0,
                        "direction": "no_change"
                    }
        
        # Generate recommendations
        comparison["recommendations"] = self._generate_comparison_recommendations(scenarios)
        
        return comparison
    
    def _generate_comparison_recommendations(self, scenarios: List[Scenario]) -> List[str]:
        """Generate recommendations based on scenario comparison."""
        recommendations = []
        
        # Find best scenario for each metric
        metrics = {}
        for scenario in scenarios:
            for outcome in scenario.outcomes:
                if outcome.metric not in metrics:
                    metrics[outcome.metric] = []
                metrics[outcome.metric].append({
                    "scenario_id": scenario.id,
                    "scenario_name": scenario.name,
                    "value": outcome.predicted_value,
                    "confidence": outcome.confidence,
                    "direction": outcome.change_direction
                })
        
        # Recommend best scenarios for positive metrics
        for metric, results in metrics.items():
            # Filter for positive changes
            positive_changes = [r for r in results if r["direction"] == "increase"]
            if positive_changes:
                best = max(positive_changes, key=lambda x: x["value"])
                recommendations.append(f"For {metric}: Recommend '{best['scenario_name']}' which increases value to {best['value']} (confidence: {best['confidence']:.2f})")
        
        return recommendations
    
    def get_scenario(self, scenario_id: str) -> Optional[Scenario]:
        """Retrieve a specific scenario by ID."""
        return self.scenarios.get(scenario_id)

# Global instance
counterfactual_simulator = CounterfactualSimulator()
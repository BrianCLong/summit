"""
Red/Blue Team Exercise Management for Adversarial Misinformation Defense Platform

This module implements adversarial red/blue team exercise management with
scenario builder UI for creating and managing adversarial exercises.
"""
import numpy as np
import pandas as pd
from typing import List, Dict, Any, Optional, Tuple
from pathlib import Path
import random
import json
import logging
from datetime import datetime
from dataclasses import dataclass, asdict
from enum import Enum
import uuid


class ExerciseType(Enum):
    """
    Types of adversarial exercises
    """
    SOCIAL_ENGINEERING = "social_engineering"
    DEEPFAKE_DETECTION = "deepfake_detection"
    MEME_CAMPAIGN = "meme_campaign"
    NARRATIVE_CONTROL = "narrative_control"
    COORDINATION_DISRUPTION = "coordination_disruption"
    INFORMATION_WARFARE = "information_warfare"
    PSYCHOLOGICAL_OPERATIONS = "psychological_operations"


class ScenarioDifficulty(Enum):
    """
    Difficulty levels for scenarios
    """
    BEGINNER = "beginner"
    INTERMEDIATE = "intermediate"
    ADVANCED = "advanced"
    EXPERT = "expert"
    CUSTOM = "custom"


class TeamRole(Enum):
    """
    Roles in red/blue team exercises
    """
    RED_TEAM_ATTACKER = "red_team_attacker"
    BLUE_TEAM_DEFENDER = "blue_team_defender"
    WHITE_TEAM_OBSERVER = "white_team_observer"
    GRAY_TEAM_MODERATOR = "gray_team_moderator"


@dataclass
class AdversarialScenario:
    """
    Definition of an adversarial scenario for red/blue team exercises
    """
    scenario_id: str
    name: str
    description: str
    exercise_type: ExerciseType
    difficulty: ScenarioDifficulty
    objectives: List[str]
    constraints: List[str]
    success_criteria: List[str]
    resources_required: Dict[str, Any]
    estimated_duration: int  # minutes
    team_roles: List[TeamRole]
    threat_actors_involved: List[str]
    detection_methods_to_test: List[str]
    mitigation_strategies: List[str]
    created_by: str
    created_date: datetime
    last_modified: datetime
    version: str
    tags: List[str]
    dependencies: List[str]  # Other scenario IDs this depends on


@dataclass
class ExerciseSession:
    """
    Instance of an exercise session
    """
    session_id: str
    scenario_id: str
    start_time: datetime
    end_time: Optional[datetime]
    participating_teams: List[Dict[str, Any]]  # Team role and members
    current_phase: str
    metrics: Dict[str, Any]  # Real-time metrics during exercise
    incidents: List[Dict[str, Any]]  # Incidents that occurred
    decisions_made: List[Dict[str, Any]]  # Key decisions during exercise
    final_evaluation: Optional[Dict[str, Any]]  # Final evaluation results


class RedBlueTeamExerciseManager:
    """
    Manager for red/blue team adversarial exercises
    """
    
    def __init__(self):
        """
        Initialize the exercise manager
        """
        self.logger = logging.getLogger(__name__)
        self.logger.setLevel(logging.INFO)
        
        # Store scenarios and exercise sessions
        self.scenarios: Dict[str, AdversarialScenario] = {}
        self.exercise_sessions: Dict[str, ExerciseSession] = {}
        
        # Initialize with some basic scenarios
        self._initialize_basic_scenarios()
    
    def _initialize_basic_scenarios(self):
        """
        Initialize with basic adversarial scenarios
        """
        basic_scenarios = [
            AdversarialScenario(
                scenario_id=str(uuid.uuid4()),
                name="Basic Social Engineering Test",
                description="Test defenses against basic social engineering tactics",
                exercise_type=ExerciseType.SOCIAL_ENGINEERING,
                difficulty=ScenarioDifficulty.BEGINNER,
                objectives=[
                    "Identify phishing attempts in email communications",
                    "Recognize manipulation tactics in social interactions",
                    "Report suspicious activities appropriately"
                ],
                constraints=[
                    "Limited to email-based attacks",
                    "No physical access to systems",
                    "Time limit of 30 minutes"
                ],
                success_criteria=[
                    "Correctly identify 80% of phishing attempts",
                    "Report all suspicious emails within 5 minutes",
                    "No credential disclosures"
                ],
                resources_required={
                    "email_server": 1,
                    "participant_accounts": 10,
                    "red_team_personnel": 2
                },
                estimated_duration=30,
                team_roles=[TeamRole.RED_TEAM_ATTACKER, TeamRole.BLUE_TEAM_DEFENDER],
                threat_actors_involved=["Generic Phishing Group"],
                detection_methods_to_test=["email_content analysis", "sender verification"],
                mitigation_strategies=["user training", "email filtering", "incident reporting"],
                created_by="System",
                created_date=datetime.now(),
                last_modified=datetime.now(),
                version="1.0",
                tags=["phishing", "email", "beginner"],
                dependencies=[]
            ),
            AdversarialScenario(
                scenario_id=str(uuid.uuid4()),
                name="Intermediate Meme Campaign Simulation",
                description="Simulate a coordinated meme-based misinformation campaign",
                exercise_type=ExerciseType.MEME_CAMPAIGN,
                difficulty=ScenarioDifficulty.INTERMEDIATE,
                objectives=[
                    "Detect coordinated meme distribution patterns",
                    "Identify manipulated content and false narratives",
                    "Track source origins and amplification networks"
                ],
                constraints=[
                    "Limited to social media platforms",
                    "Maximum 100 participants",
                    "Duration of 2 hours"
                ],
                success_criteria=[
                    "Detect 75% of manipulated content",
                    "Map 90% of amplification network",
                    "Identify campaign origin within 30 minutes"
                ],
                resources_required={
                    "social_media_accounts": 50,
                    "content_creators": 5,
                    "analytics_tools": 2
                },
                estimated_duration=120,
                team_roles=[TeamRole.RED_TEAM_ATTACKER, TeamRole.BLUE_TEAM_DEFENDER, TeamRole.WHITE_TEAM_OBSERVER],
                threat_actors_involved=["Meme Warfare Collective"],
                detection_methods_to_test=["content analysis", "network analysis", "behavioral patterns"],
                mitigation_strategies=["fact checking", "content moderation", "source verification"],
                created_by="System",
                created_date=datetime.now(),
                last_modified=datetime.now(),
                version="1.0",
                tags=["memes", "social_media", "intermediate"],
                dependencies=[]
            )
        ]
        
        for scenario in basic_scenarios:
            self.scenarios[scenario.scenario_id] = scenario
    
    def create_scenario(self, name: str, description: str, exercise_type: ExerciseType,
                       difficulty: ScenarioDifficulty, objectives: List[str],
                       **kwargs) -> AdversarialScenario:
        """
        Create a new adversarial scenario
        """
        scenario = AdversarialScenario(
            scenario_id=str(uuid.uuid4()),
            name=name,
            description=description,
            exercise_type=exercise_type,
            difficulty=difficulty,
            objectives=objectives,
            constraints=kwargs.get('constraints', []),
            success_criteria=kwargs.get('success_criteria', []),
            resources_required=kwargs.get('resources_required', {}),
            estimated_duration=kwargs.get('estimated_duration', 60),
            team_roles=kwargs.get('team_roles', [TeamRole.RED_TEAM_ATTACKER, TeamRole.BLUE_TEAM_DEFENDER]),
            threat_actors_involved=kwargs.get('threat_actors_involved', []),
            detection_methods_to_test=kwargs.get('detection_methods_to_test', []),
            mitigation_strategies=kwargs.get('mitigation_strategies', []),
            created_by=kwargs.get('created_by', 'Unknown'),
            created_date=datetime.now(),
            last_modified=datetime.now(),
            version=kwargs.get('version', '1.0'),
            tags=kwargs.get('tags', []),
            dependencies=kwargs.get('dependencies', [])
        )
        
        # Validate the scenario
        if self.validate_scenario(scenario):
            self.scenarios[scenario.scenario_id] = scenario
            self.logger.info(f"Created new scenario: {scenario.name}")
            return scenario
        else:
            self.logger.error(f"Invalid scenario: {scenario.name}")
            raise ValueError("Invalid scenario configuration")
    
    def modify_scenario(self, scenario_id: str, **kwargs) -> Optional[AdversarialScenario]:
        """
        Modify an existing scenario
        """
        if scenario_id in self.scenarios:
            scenario = self.scenarios[scenario_id]
            
            # Update fields if provided
            for key, value in kwargs.items():
                if hasattr(scenario, key):
                    setattr(scenario, key, value)
            
            # Update last modified timestamp
            scenario.last_modified = datetime.now()
            
            # Re-validate the scenario
            if self.validate_scenario(scenario):
                self.scenarios[scenario_id] = scenario
                self.logger.info(f"Modified scenario: {scenario.name}")
                return scenario
            else:
                self.logger.error(f"Modified scenario is invalid: {scenario.name}")
                return None
        else:
            self.logger.warning(f"Scenario ID not found: {scenario_id}")
            return None
    
    def validate_scenario(self, scenario: AdversarialScenario) -> bool:
        """
        Validate that a scenario is properly formed
        """
        # Check required fields
        if not scenario.name or not scenario.description:
            return False
        
        if not scenario.objectives:
            return False
        
        # Check that estimated duration is positive
        if scenario.estimated_duration <= 0:
            return False
        
        # Check that there are team roles defined
        if not scenario.team_roles:
            return False
        
        # Check dependencies exist (if any)
        for dep_id in scenario.dependencies:
            if dep_id not in self.scenarios:
                self.logger.warning(f"Dependency scenario not found: {dep_id}")
                return False
        
        return True
    
    def start_exercise_session(self, scenario_id: str, 
                             participating_teams: List[Dict[str, Any]]) -> ExerciseSession:
        """
        Start a new exercise session based on a scenario
        """
        if scenario_id not in self.scenarios:
            raise ValueError(f"Scenario ID not found: {scenario_id}")
        
        scenario = self.scenarios[scenario_id]
        
        session = ExerciseSession(
            session_id=str(uuid.uuid4()),
            scenario_id=scenario_id,
            start_time=datetime.now(),
            end_time=None,
            participating_teams=participating_teams,
            current_phase="initialization",
            metrics={},
            incidents=[],
            decisions_made=[],
            final_evaluation=None
        )
        
        self.exercise_sessions[session.session_id] = session
        self.logger.info(f"Started exercise session for scenario: {scenario.name}")
        return session
    
    def update_exercise_metrics(self, session_id: str, metrics: Dict[str, Any]):
        """
        Update real-time metrics during an exercise
        """
        if session_id in self.exercise_sessions:
            session = self.exercise_sessions[session_id]
            session.metrics.update(metrics)
            self.logger.info(f"Updated metrics for session {session_id}")
        else:
            self.logger.warning(f"Session ID not found: {session_id}")
    
    def record_incident(self, session_id: str, incident: Dict[str, Any]):
        """
        Record an incident that occurred during an exercise
        """
        if session_id in self.exercise_sessions:
            session = self.exercise_sessions[session_id]
            incident['timestamp'] = datetime.now().isoformat()
            session.incidents.append(incident)
            self.logger.info(f"Recorded incident in session {session_id}")
        else:
            self.logger.warning(f"Session ID not found: {session_id}")
    
    def record_decision(self, session_id: str, decision: Dict[str, Any]):
        """
        Record a key decision made during an exercise
        """
        if session_id in self.exercise_sessions:
            session = self.exercise_sessions[session_id]
            decision['timestamp'] = datetime.now().isoformat()
            session.decisions_made.append(decision)
            self.logger.info(f"Recorded decision in session {session_id}")
        else:
            self.logger.warning(f"Session ID not found: {session_id}")
    
    def advance_exercise_phase(self, session_id: str, new_phase: str):
        """
        Advance the exercise to a new phase
        """
        if session_id in self.exercise_sessions:
            session = self.exercise_sessions[session_id]
            session.current_phase = new_phase
            self.logger.info(f"Advanced session {session_id} to phase: {new_phase}")
        else:
            self.logger.warning(f"Session ID not found: {session_id}")
    
    def complete_exercise_session(self, session_id: str, 
                                evaluation: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """
        Complete an exercise session and record final evaluation
        """
        if session_id in self.exercise_sessions:
            session = self.exercise_sessions[session_id]
            session.end_time = datetime.now()
            session.final_evaluation = evaluation
            
            # Generate comprehensive report
            report = self._generate_exercise_report(session)
            self.logger.info(f"Completed exercise session {session_id}")
            return report
        else:
            self.logger.warning(f"Session ID not found: {session_id}")
            return None
    
    def _generate_exercise_report(self, session: ExerciseSession) -> Dict[str, Any]:
        """
        Generate a comprehensive report for a completed exercise session
        """
        scenario = self.scenarios[session.scenario_id]
        
        # Calculate performance metrics
        total_incidents = len(session.incidents)
        resolved_incidents = len([i for i in session.incidents if i.get('resolved', False)])
        resolution_rate = resolved_incidents / total_incidents if total_incidents > 0 else 0.0
        
        # Calculate time-based metrics
        duration = (session.end_time - session.start_time).total_seconds() / 60 if session.end_time else 0
        
        report = {
            "session_id": session.session_id,
            "scenario_name": scenario.name,
            "start_time": session.start_time.isoformat(),
            "end_time": session.end_time.isoformat() if session.end_time else None,
            "duration_minutes": duration,
            "participating_teams": session.participating_teams,
            "final_phase": session.current_phase,
            "total_incidents": total_incidents,
            "resolved_incidents": resolved_incidents,
            "resolution_rate": resolution_rate,
            "decisions_made": len(session.decisions_made),
            "key_metrics": session.metrics,
            "incidents_summary": session.incidents,
            "decisions_summary": session.decisions_made,
            "final_evaluation": session.final_evaluation,
            "report_timestamp": datetime.now().isoformat()
        }
        
        return report
    
    def get_scenario_by_id(self, scenario_id: str) -> Optional[AdversarialScenario]:
        """
        Get a scenario by its ID
        """
        return self.scenarios.get(scenario_id)
    
    def get_all_scenarios(self) -> List[AdversarialScenario]:
        """
        Get all scenarios
        """
        return list(self.scenarios.values())
    
    def get_scenarios_by_type(self, exercise_type: ExerciseType) -> List[AdversarialScenario]:
        """
        Get scenarios filtered by exercise type
        """
        return [scenario for scenario in self.scenarios.values() 
                if scenario.exercise_type == exercise_type]
    
    def get_scenarios_by_difficulty(self, difficulty: ScenarioDifficulty) -> List[AdversarialScenario]:
        """
        Get scenarios filtered by difficulty level
        """
        return [scenario for scenario in self.scenarios.values() 
                if scenario.difficulty == difficulty]
    
    def get_active_sessions(self) -> List[ExerciseSession]:
        """
        Get all currently active (not completed) exercise sessions
        """
        return [session for session in self.exercise_sessions.values() 
                if session.end_time is None]
    
    def get_completed_sessions(self) -> List[ExerciseSession]:
        """
        Get all completed exercise sessions
        """
        return [session for session in self.exercise_sessions.values() 
                if session.end_time is not None]


class ScenarioBuilderCLI:
    """
    Command-line interface for building scenarios
    """
    
    def __init__(self, manager: RedBlueTeamExerciseManager):
        self.manager = manager
        self.logger = logging.getLogger(__name__)
    
    def run_interactive_builder(self):
        """
        Run interactive scenario builder
        """
        print("=== Adversarial Scenario Builder ===")
        print("Building a new adversarial scenario...")
        
        # Get basic scenario information
        name = input("Scenario Name: ")
        description = input("Description: ")
        
        # Get exercise type
        print("\nExercise Types:")
        for i, etype in enumerate(ExerciseType, 1):
            print(f"{i}. {etype.value}")
        
        try:
            type_choice = int(input("Select Exercise Type (1-{}): ".format(len(ExerciseType))))
            exercise_type = list(ExerciseType)[type_choice - 1]
        except (ValueError, IndexError):
            print("Invalid selection. Using default.")
            exercise_type = ExerciseType.SOCIAL_ENGINEERING
        
        # Get difficulty level
        print("\nDifficulty Levels:")
        for i, diff in enumerate(ScenarioDifficulty, 1):
            print(f"{i}. {diff.value}")
        
        try:
            diff_choice = int(input("Select Difficulty (1-{}): ".format(len(ScenarioDifficulty))))
            difficulty = list(ScenarioDifficulty)[diff_choice - 1]
        except (ValueError, IndexError):
            print("Invalid selection. Using default.")
            difficulty = ScenarioDifficulty.INTERMEDIATE
        
        # Get objectives
        print("\nEnter objectives (one per line, empty line to finish):")
        objectives = []
        while True:
            obj = input("Objective: ").strip()
            if not obj:
                break
            objectives.append(obj)
        
        # Create the scenario
        try:
            scenario = self.manager.create_scenario(
                name=name,
                description=description,
                exercise_type=exercise_type,
                difficulty=difficulty,
                objectives=objectives,
                created_by="CLI User"
            )
            
            print(f"\nScenario created successfully!")
            print(f"Scenario ID: {scenario.scenario_id}")
            print(f"Name: {scenario.name}")
            
        except Exception as e:
            print(f"Error creating scenario: {str(e)}")


# Convenience functions for easy usage
def create_exercise_manager() -> RedBlueTeamExerciseManager:
    """
    Factory function to create and initialize the exercise manager
    """
    return RedBlueTeamExerciseManager()


def create_scenario_builder_cli(manager: RedBlueTeamExerciseManager) -> ScenarioBuilderCLI:
    """
    Factory function to create CLI scenario builder
    """
    return ScenarioBuilderCLI(manager)
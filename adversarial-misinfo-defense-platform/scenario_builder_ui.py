"""
Web-based Scenario Builder UI for Adversarial Misinformation Defense Platform

This module provides a simple web interface for building and managing
adversarial scenarios for red/blue team exercises.
"""
import streamlit as st
import pandas as pd
import json
import uuid
from datetime import datetime
from typing import List, Dict, Any, Optional
import logging

# Import our modules
from red_blue_team import (
    RedBlueTeamExerciseManager, AdversarialScenario, ExerciseType, 
    ScenarioDifficulty, TeamRole
)


class ScenarioBuilderWebUI:
    """
    Web-based UI for building adversarial scenarios
    """
    
    def __init__(self):
        """
        Initialize the web UI
        """
        self.logger = logging.getLogger(__name__)
        self.manager = RedBlueTeamExerciseManager()
        self.setup_logging()
    
    def setup_logging(self):
        """
        Setup logging for the web UI
        """
        self.logger.setLevel(logging.INFO)
        if not self.logger.handlers:
            handler = logging.StreamHandler()
            formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
            handler.setFormatter(formatter)
            self.logger.addHandler(handler)
    
    def run(self):
        """
        Run the Streamlit web application
        """
        st.set_page_config(
            page_title="Adversarial Scenario Builder",
            page_icon="🛡️",
            layout="wide"
        )
        
        # Session state initialization
        if 'scenarios' not in st.session_state:
            st.session_state.scenarios = []
        if 'current_scenario' not in st.session_state:
            st.session_state.current_scenario = None
        
        # Main app
        st.title("🛡️ Adversarial Scenario Builder")
        st.markdown("---")
        
        # Navigation
        page = st.sidebar.selectbox(
            "Navigation",
            ["Dashboard", "Create Scenario", "Manage Scenarios", "Exercise Sessions", "Settings"]
        )
        
        if page == "Dashboard":
            self.render_dashboard()
        elif page == "Create Scenario":
            self.render_create_scenario()
        elif page == "Manage Scenarios":
            self.render_manage_scenarios()
        elif page == "Exercise Sessions":
            self.render_exercise_sessions()
        elif page == "Settings":
            self.render_settings()
    
    def render_dashboard(self):
        """
        Render the dashboard page
        """
        st.header("Dashboard")
        
        # Show scenario statistics
        all_scenarios = self.manager.get_all_scenarios()
        
        col1, col2, col3 = st.columns(3)
        
        with col1:
            st.metric("Total Scenarios", len(all_scenarios))
        
        with col2:
            active_sessions = len(self.manager.get_active_sessions())
            st.metric("Active Sessions", active_sessions)
        
        with col3:
            completed_sessions = len(self.manager.get_completed_sessions())
            st.metric("Completed Sessions", completed_sessions)
        
        st.markdown("---")
        
        # Show recent scenarios
        st.subheader("Recent Scenarios")
        if all_scenarios:
            # Sort by creation date
            recent_scenarios = sorted(all_scenarios, 
                                    key=lambda s: s.created_date, 
                                    reverse=True)[:5]
            
            for scenario in recent_scenarios:
                with st.expander(f"**{scenario.name}** - {scenario.difficulty.value}"):
                    st.write(f"**Type:** {scenario.exercise_type.value}")
                    st.write(f"**Description:** {scenario.description}")
                    st.write(f"**Created:** {scenario.created_date.strftime('%Y-%m-%d %H:%M')}")
                    st.write(f"**Objectives:** {len(scenario.objectives)}")
        else:
            st.info("No scenarios created yet. Start by creating your first scenario!")
    
    def render_create_scenario(self):
        """
        Render the create scenario page
        """
        st.header("Create New Scenario")
        
        # Basic Information
        st.subheader("Basic Information")
        name = st.text_input("Scenario Name", help="Enter a descriptive name for your scenario")
        description = st.text_area("Description", help="Provide a detailed description of the scenario")
        
        col1, col2 = st.columns(2)
        
        with col1:
            exercise_type = st.selectbox(
                "Exercise Type",
                options=list(ExerciseType),
                format_func=lambda x: x.value,
                help="Select the type of adversarial exercise"
            )
        
        with col2:
            difficulty = st.selectbox(
                "Difficulty Level",
                options=list(ScenarioDifficulty),
                format_func=lambda x: x.value,
                help="Select the difficulty level"
            )
        
        # Objectives
        st.subheader("Objectives")
        st.write("Enter the objectives for this scenario (one per line)")
        objectives_text = st.text_area(
            "Objectives",
            help="What should participants accomplish during this exercise?",
            height=150
        )
        objectives = [obj.strip() for obj in objectives_text.split('\n') if obj.strip()]
        
        # Constraints
        st.subheader("Constraints")
        st.write("Enter any constraints for this scenario (one per line)")
        constraints_text = st.text_area(
            "Constraints",
            help="Any limitations or rules for the exercise?",
            height=100
        )
        constraints = [con.strip() for con in constraints_text.split('\n') if con.strip()]
        
        # Success Criteria
        st.subheader("Success Criteria")
        st.write("Enter criteria for measuring success (one per line)")
        success_text = st.text_area(
            "Success Criteria",
            help="How will you know if the exercise was successful?",
            height=100
        )
        success_criteria = [crit.strip() for crit in success_text.split('\n') if crit.strip()]
        
        # Team Roles
        st.subheader("Team Roles")
        st.write("Select the team roles involved in this scenario")
        team_roles_selected = st.multiselect(
            "Team Roles",
            options=list(TeamRole),
            format_func=lambda x: x.value,
            default=[TeamRole.RED_TEAM_ATTACKER, TeamRole.BLUE_TEAM_DEFENDER]
        )
        
        # Resources
        st.subheader("Resources Required")
        st.write("Estimate the resources needed for this scenario")
        estimated_duration = st.number_input(
            "Estimated Duration (minutes)",
            min_value=1,
            max_value=1440,  # 24 hours
            value=60,
            help="How long will the exercise take?"
        )
        
        # Tags
        st.subheader("Tags")
        st.write("Add tags to categorize your scenario (comma-separated)")
        tags_input = st.text_input("Tags", help="e.g., phishing, social_media, beginner")
        tags = [tag.strip() for tag in tags_input.split(',') if tag.strip()]
        
        # Action buttons
        st.markdown("---")
        col1, col2 = st.columns(2)
        
        with col1:
            if st.button("Save Scenario", type="primary", use_container_width=True):
                if name and description and objectives:
                    try:
                        scenario = self.manager.create_scenario(
                            name=name,
                            description=description,
                            exercise_type=exercise_type,
                            difficulty=difficulty,
                            objectives=objectives,
                            constraints=constraints,
                            success_criteria=success_criteria,
                            team_roles=team_roles_selected,
                            estimated_duration=estimated_duration,
                            threat_actors_involved=[],
                            detection_methods_to_test=[],
                            mitigation_strategies=[],
                            created_by="Web UI User",
                            tags=tags,
                            resources_required={},
                            dependencies=[]
                        )
                        
                        st.success(f"Scenario '{scenario.name}' created successfully!")
                        st.balloons()
                    except Exception as e:
                        st.error(f"Error creating scenario: {str(e)}")
                else:
                    st.warning("Please fill in all required fields (Name, Description, Objectives)")
        
        with col2:
            if st.button("Reset Form", use_container_width=True):
                st.experimental_rerun()
    
    def render_manage_scenarios(self):
        """
        Render the manage scenarios page
        """
        st.header("Manage Scenarios")
        
        # Get all scenarios
        scenarios = self.manager.get_all_scenarios()
        
        if not scenarios:
            st.info("No scenarios available. Create your first scenario!")
            return
        
        # Display scenarios in a table
        scenario_data = []
        for scenario in scenarios:
            scenario_data.append({
                "Name": scenario.name,
                "Type": scenario.exercise_type.value,
                "Difficulty": scenario.difficulty.value,
                "Objectives": len(scenario.objectives),
                "Duration": f"{scenario.estimated_duration} min",
                "Created": scenario.created_date.strftime("%Y-%m-%d"),
                "ID": scenario.scenario_id[:8]  # Short ID for display
            })
        
        df = pd.DataFrame(scenario_data)
        st.dataframe(df, use_container_width=True)
        
        # Scenario details
        st.markdown("---")
        st.subheader("Scenario Details")
        
        selected_scenario_name = st.selectbox(
            "Select a scenario to view details:",
            options=[s.name for s in scenarios]
        )
        
        if selected_scenario_name:
            selected_scenario = next((s for s in scenarios if s.name == selected_scenario_name), None)
            
            if selected_scenario:
                with st.expander("Detailed View", expanded=True):
                    col1, col2 = st.columns(2)
                    
                    with col1:
                        st.write(f"**Name:** {selected_scenario.name}")
                        st.write(f"**Type:** {selected_scenario.exercise_type.value}")
                        st.write(f"**Difficulty:** {selected_scenario.difficulty.value}")
                        st.write(f"**Duration:** {selected_scenario.estimated_duration} minutes")
                        st.write(f"**Created:** {selected_scenario.created_date.strftime('%Y-%m-%d %H:%M')}")
                        st.write(f"**Version:** {selected_scenario.version}")
                    
                    with col2:
                        st.write(f"**Objectives:** {len(selected_scenario.objectives)}")
                        st.write(f"**Constraints:** {len(selected_scenario.constraints)}")
                        st.write(f"**Success Criteria:** {len(selected_scenario.success_criteria)}")
                        st.write(f"**Team Roles:** {[role.value for role in selected_scenario.team_roles]}")
                        st.write(f"**Tags:** {', '.join(selected_scenario.tags)}")
                
                # Detailed sections
                tab1, tab2, tab3, tab4 = st.tabs([
                    "Description", "Objectives", "Constraints", "Success Criteria"
                ])
                
                with tab1:
                    st.write(selected_scenario.description)
                
                with tab2:
                    for i, obj in enumerate(selected_scenario.objectives, 1):
                        st.write(f"{i}. {obj}")
                
                with tab3:
                    if selected_scenario.constraints:
                        for i, con in enumerate(selected_scenario.constraints, 1):
                            st.write(f"{i}. {con}")
                    else:
                        st.info("No constraints specified")
                
                with tab4:
                    for i, crit in enumerate(selected_scenario.success_criteria, 1):
                        st.write(f"{i}. {crit}")
    
    def render_exercise_sessions(self):
        """
        Render the exercise sessions page
        """
        st.header("Exercise Sessions")
        
        # Show active and completed sessions
        active_sessions = self.manager.get_active_sessions()
        completed_sessions = self.manager.get_completed_sessions()
        
        col1, col2 = st.columns(2)
        
        with col1:
            st.subheader("Active Sessions")
            if active_sessions:
                for session in active_sessions:
                    scenario = self.manager.get_scenario_by_id(session.scenario_id)
                    if scenario:
                        with st.expander(f"**{scenario.name}**", expanded=False):
                            st.write(f"**Started:** {session.start_time.strftime('%Y-%m-%d %H:%M')}")
                            st.write(f"**Current Phase:** {session.current_phase}")
                            st.write(f"**Teams Involved:** {len(session.participating_teams)}")
                            st.progress(len(session.incidents) / 10.0)  # Mock progress
            else:
                st.info("No active sessions")
        
        with col2:
            st.subheader("Completed Sessions")
            if completed_sessions:
                for session in completed_sessions:
                    scenario = self.manager.get_scenario_by_id(session.scenario_id)
                    if scenario:
                        with st.expander(f"**{scenario.name}**", expanded=False):
                            st.write(f"**Completed:** {session.end_time.strftime('%Y-%m-%d %H:%M')}")
                            st.write(f"**Total Incidents:** {len(session.incidents)}")
                            st.write(f"**Decisions Made:** {len(session.decisions_made)}")
                            
                            if session.final_evaluation:
                                st.write("**Final Evaluation:**")
                                st.json(session.final_evaluation)
            else:
                st.info("No completed sessions")
        
        # Start new session
        st.markdown("---")
        st.subheader("Start New Exercise Session")
        
        scenarios = self.manager.get_all_scenarios()
        if scenarios:
            selected_scenario_name = st.selectbox(
                "Select Scenario:",
                options=[s.name for s in scenarios]
            )
            
            if selected_scenario_name:
                selected_scenario = next((s for s in scenarios if s.name == selected_scenario_name), None)
                
                if selected_scenario:
                    teams_input = st.text_input(
                        "Participating Teams (JSON format):",
                        value='[{"role": "red_team_attacker", "members": ["alice", "bob"]}, {"role": "blue_team_defender", "members": ["charlie", "diana"]}]',
                        help="Enter team information in JSON format"
                    )
                    
                    if st.button("Start Session"):
                        try:
                            teams_data = json.loads(teams_input)
                            session = self.manager.start_exercise_session(
                                selected_scenario.scenario_id,
                                teams_data
                            )
                            st.success(f"Session started successfully! ID: {session.session_id[:8]}")
                        except Exception as e:
                            st.error(f"Error starting session: {str(e)}")
        else:
            st.info("No scenarios available. Create scenarios first!")
    
    def render_settings(self):
        """
        Render the settings page
        """
        st.header("Settings")
        
        st.subheader("System Information")
        st.info("Adversarial Scenario Builder v1.0")
        
        st.subheader("Export Data")
        if st.button("Export All Scenarios"):
            scenarios = self.manager.get_all_scenarios()
            scenario_dicts = []
            for scenario in scenarios:
                scenario_dict = {
                    "scenario_id": scenario.scenario_id,
                    "name": scenario.name,
                    "description": scenario.description,
                    "exercise_type": scenario.exercise_type.value,
                    "difficulty": scenario.difficulty.value,
                    "objectives": scenario.objectives,
                    "constraints": scenario.constraints,
                    "success_criteria": scenario.success_criteria,
                    "resources_required": scenario.resources_required,
                    "estimated_duration": scenario.estimated_duration,
                    "team_roles": [role.value for role in scenario.team_roles],
                    "threat_actors_involved": scenario.threat_actors_involved,
                    "detection_methods_to_test": scenario.detection_methods_to_test,
                    "mitigation_strategies": scenario.mitigation_strategies,
                    "created_by": scenario.created_by,
                    "created_date": scenario.created_date.isoformat(),
                    "last_modified": scenario.last_modified.isoformat(),
                    "version": scenario.version,
                    "tags": scenario.tags,
                    "dependencies": scenario.dependencies
                }
                scenario_dicts.append(scenario_dict)
            
            st.download_button(
                label="Download Scenarios JSON",
                data=json.dumps(scenario_dicts, indent=2),
                file_name=f"scenarios_export_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json",
                mime="application/json"
            )
        
        st.subheader("Import Data")
        uploaded_file = st.file_uploader("Upload scenarios file", type=['json'])
        if uploaded_file is not None:
            try:
                # Read and parse the uploaded file
                content = uploaded_file.getvalue().decode('utf-8')
                scenarios_data = json.loads(content)
                
                imported_count = 0
                for scenario_data in scenarios_data:
                    # Convert enum values back to enums
                    try:
                        scenario_data['exercise_type'] = ExerciseType(scenario_data['exercise_type'])
                        scenario_data['difficulty'] = ScenarioDifficulty(scenario_data['difficulty'])
                        scenario_data['team_roles'] = [TeamRole(role) for role in scenario_data['team_roles']]
                        scenario_data['created_date'] = datetime.fromisoformat(scenario_data['created_date'])
                        scenario_data['last_modified'] = datetime.fromisoformat(scenario_data['last_modified'])
                        
                        # Create scenario
                        scenario = AdversarialScenario(**scenario_data)
                        if self.manager.validate_scenario(scenario):
                            self.manager.scenarios[scenario.scenario_id] = scenario
                            imported_count += 1
                    except Exception as e:
                        st.warning(f"Skipping scenario due to error: {str(e)}")
                
                st.success(f"Successfully imported {imported_count} scenarios!")
            except Exception as e:
                st.error(f"Error importing scenarios: {str(e)}")


# Convenience function to run the web UI
def run_scenario_builder_web_ui():
    """
    Run the scenario builder web UI
    """
    ui = ScenarioBuilderWebUI()
    ui.run()


# CLI entry point
if __name__ == "__main__":
    # Check if we're running in Streamlit
    try:
        # This will work when running with `streamlit run`
        run_scenario_builder_web_ui()
    except Exception:
        # Fallback for direct execution
        print("Run this script with: streamlit run scenario_builder_ui.py")
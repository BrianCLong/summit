"""
Web-based Scenario Builder UI for Adversarial Misinformation Defense Platform

This module provides a simple web interface for building and managing
adversarial scenarios for red/blue team exercises.
"""
import streamlit as st
import pandas as pd
import json
from datetime import datetime
from typing import List, Dict, Any, Optional
import logging
import uuid


class ScenarioBuilderWebUI:
    """
    Web-based UI for building adversarial scenarios
    """
    
    def __init__(self, exercise_manager):
        """
        Initialize the web UI with an exercise manager
        """
        self.exercise_manager = exercise_manager
        self.logger = logging.getLogger(__name__)
        self.logger.setLevel(logging.INFO)
    
    def run(self):
        """
        Run the Streamlit web application
        """
        st.set_page_config(
            page_title="Adversarial Scenario Builder",
            page_icon="🛡️",
            layout="wide"
        )
        
        # Main app
        st.title("🛡️ Adversarial Scenario Builder")
        st.markdown("---")
        
        # Navigation
        page = st.sidebar.selectbox(
            "Navigation",
            ["Dashboard", "Create Scenario", "Manage Scenarios", "Exercise Sessions"]
        )
        
        if page == "Dashboard":
            self.render_dashboard()
        elif page == "Create Scenario":
            self.render_create_scenario()
        elif page == "Manage Scenarios":
            self.render_manage_scenarios()
        elif page == "Exercise Sessions":
            self.render_exercise_sessions()
    
    def render_dashboard(self):
        """
        Render the dashboard page
        """
        st.header("Dashboard")
        
        # Show scenario statistics
        all_scenarios = self.exercise_manager.get_all_scenarios()
        
        col1, col2, col3 = st.columns(3)
        
        with col1:
            st.metric("Total Scenarios", len(all_scenarios))
        
        with col2:
            active_sessions = len(self.exercise_manager.get_active_sessions())
            st.metric("Active Sessions", active_sessions)
        
        with col3:
            completed_sessions = len(self.exercise_manager.get_completed_sessions())
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
            exercise_types = ["social_engineering", "deepfake_detection", "meme_campaign", 
                            "narrative_control", "coordination_disruption", "information_warfare"]
            exercise_type = st.selectbox(
                "Exercise Type",
                options=exercise_types,
                help="Select the type of adversarial exercise"
            )
        
        with col2:
            difficulties = ["beginner", "intermediate", "advanced", "expert", "custom"]
            difficulty = st.selectbox(
                "Difficulty Level",
                options=difficulties,
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
        team_roles_options = ["red_team_attacker", "blue_team_defender", "white_team_observer", "gray_team_moderator"]
        team_roles_selected = st.multiselect(
            "Team Roles",
            options=team_roles_options,
            default=["red_team_attacker", "blue_team_defender"]
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
        
        # Action button
        st.markdown("---")
        if st.button("Save Scenario", type="primary", use_container_width=True):
            if name and description and objectives:
                try:
                    scenario = self.exercise_manager.create_scenario(
                        name=name,
                        description=description,
                        exercise_type=exercise_type,
                        difficulty=difficulty,
                        objectives=objectives,
                        constraints=constraints,
                        success_criteria=success_criteria,
                        team_roles=team_roles_selected,
                        estimated_duration=estimated_duration,
                        created_by="Web UI User",
                        tags=tags
                    )
                    
                    st.success(f"Scenario '{scenario.name}' created successfully!")
                    st.balloons()
                except Exception as e:
                    st.error(f"Error creating scenario: {str(e)}")
            else:
                st.warning("Please fill in all required fields (Name, Description, Objectives)")
    
    def render_manage_scenarios(self):
        """
        Render the manage scenarios page
        """
        st.header("Manage Scenarios")
        
        # Get all scenarios
        scenarios = self.exercise_manager.get_all_scenarios()
        
        if not scenarios:
            st.info("No scenarios available. Create your first scenario!")
            return
        
        # Display scenarios in a table
        scenario_data = []
        for scenario in scenarios:
            scenario_data.append({
                "Name": scenario.name,
                "Type": scenario.exercise_type,
                "Difficulty": scenario.difficulty,
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
                        st.write(f"**Type:** {selected_scenario.exercise_type}")
                        st.write(f"**Difficulty:** {selected_scenario.difficulty}")
                        st.write(f"**Duration:** {selected_scenario.estimated_duration} minutes")
                        st.write(f"**Created:** {selected_scenario.created_date.strftime('%Y-%m-%d %H:%M')}")
                    
                    with col2:
                        st.write(f"**Objectives:** {len(selected_scenario.objectives)}")
                        st.write(f"**Constraints:** {len(selected_scenario.constraints)}")
                        st.write(f"**Success Criteria:** {len(selected_scenario.success_criteria)}")
                        st.write(f"**Team Roles:** {', '.join(selected_scenario.team_roles)}")
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
        active_sessions = self.exercise_manager.get_active_sessions()
        completed_sessions = self.exercise_manager.get_completed_sessions()
        
        col1, col2 = st.columns(2)
        
        with col1:
            st.subheader("Active Sessions")
            if active_sessions:
                for session in active_sessions:
                    scenario = self.exercise_manager.get_scenario_by_id(session.scenario_id)
                    if scenario:
                        with st.expander(f"**{scenario.name}**", expanded=False):
                            st.write(f"**Started:** {session.start_time.strftime('%Y-%m-%d %H:%M')}")
                            st.write(f"**Current Phase:** {session.current_phase}")
                            st.write(f"**Teams Involved:** {len(session.participating_teams)}")
            else:
                st.info("No active sessions")
        
        with col2:
            st.subheader("Completed Sessions")
            if completed_sessions:
                for session in completed_sessions:
                    scenario = self.exercise_manager.get_scenario_by_id(session.scenario_id)
                    if scenario:
                        with st.expander(f"**{scenario.name}**", expanded=False):
                            st.write(f"**Completed:** {session.end_time.strftime('%Y-%m-%d %H:%M')}")
                            st.write(f"**Total Incidents:** {len(session.incidents)}")
                            st.write(f"**Decisions Made:** {len(session.decisions_made)}")
            else:
                st.info("No completed sessions")


# Convenience function for easy usage
def create_scenario_builder_ui(exercise_manager) -> ScenarioBuilderWebUI:
    """
    Factory function to create and initialize the scenario builder UI
    """
    return ScenarioBuilderWebUI(exercise_manager)
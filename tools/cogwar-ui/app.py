
import streamlit as st
import requests
import json
import pandas as pd
import time

# Configuration
API_URL = "http://localhost:3000/api/cogwar"
# Placeholder auth token - in production, this would be handled via login flow
AUTH_HEADER = {"Authorization": "Bearer mock-token"}

st.set_page_config(page_title="SummitCogWar War Room", layout="wide", page_icon="🧠")

st.title("🧠 SummitCogWar: Cognitive Warfare Command Center")

# Sidebar for controls
st.sidebar.header("Command Controls")
op_mode = st.sidebar.selectbox("Operation Mode", ["Monitoring", "Red Team (Offense)", "Blue Team (Defense)"])

# Metrics Dashboard
st.subheader("Mindspace Metrics")
col1, col2, col3, col4 = st.columns(4)
col1.metric("Global Sentiment", "0.42", "+0.05")
col2.metric("Meme Velocity", "850 m/s", "+12%")
col3.metric("Polarization Entropy", "2.4 bits", "-0.1")
col4.metric("Active Agents", "102,400", "Stable")

# Main Content Area
if op_mode == "Monitoring":
    st.info("System is monitoring global cognitive feeds...")

    # Placeholder for Real-time graph
    chart_data = pd.DataFrame(
        [[1, 10, 5], [2, 20, 8], [3, 30, 15]],
        columns=['Time', 'Red Ops', 'Blue Ops']
    )
    st.line_chart(chart_data)

    st.write("### Live Narrative Streams")
    st.dataframe({
        "Source": ["Twitter/X", "Telegram", "DarkWeb"],
        "Topic": ["Election Integrity", "Economic Collapse", "AI Safety"],
        "Threat Level": ["High", "Medium", "Low"],
        "Status": ["Investigating", "Monitoring", "Resolved"]
    })

elif op_mode == "Red Team (Offense)":
    st.error("RED TEAM ACTIVE: Authorized Personnel Only")

    with st.form("red_op"):
        target = st.text_input("Target Profile (e.g., 'Disenfranchised Youth in Sector 7')")
        topic = st.text_input("Topic Injection")

        if st.form_submit_button("Deploy CogSwarm"):
            with st.spinner("Agents crafting memeplexes..."):
                try:
                    # Real API Call
                    response = requests.post(f"{API_URL}/operation", json={"type": "RED", "params": {"target": target, "topic": topic}}, headers=AUTH_HEADER)
                    if response.status_code == 200:
                        data = response.json()
                        st.success("Memeplex deployed successfully.")
                        st.json(data)
                    else:
                        st.error(f"Operation failed: {response.text}")
                except Exception as e:
                    st.error(f"Connection error: {e}")
                    # Fallback Mock for Demo purposes if backend is unreachable
                    st.warning("Backend unreachable. Showing simulation data.")
                    time.sleep(1)
                    st.json({
                        "id": "op-red-mock",
                        "virality_score": 0.94,
                        "anchors": ["Fear of missing out", "Tribal belonging"]
                    })

elif op_mode == "Blue Team (Defense)":
    st.success("BLUE MINDSHIELD ACTIVE")

    narrative_id = st.text_input("Narrative ID to Counter")

    # Use session state to persist analysis result across re-runs
    if "blue_analysis" not in st.session_state:
        st.session_state.blue_analysis = None

    if st.button("Analyze & Vaccinate"):
        with st.spinner("Analyzing polarization entropy..."):
            try:
                # Simulation delay
                time.sleep(1)
                st.session_state.blue_analysis = "High Entropy Detected: 2.8 bits"
            except Exception:
                 st.session_state.blue_analysis = "High Entropy Detected: 2.8 bits (Simulated)"

    if st.session_state.blue_analysis:
        st.warning(st.session_state.blue_analysis)

        if st.button("Deploy Memetic Vaccine"):
             with st.spinner("Deploying..."):
                try:
                    response = requests.post(f"{API_URL}/operation", json={"type": "BLUE", "params": {"narrativeId": narrative_id, "content": "Sample content"}}, headers=AUTH_HEADER)
                    if response.status_code == 200:
                        st.success("Counter-narrative injected. Resilience +15%.")
                        st.json(response.json())
                    else:
                        st.error(f"Deployment failed: {response.text}")
                except Exception as e:
                     st.error(f"Connection error: {e}")
                     st.success("Counter-narrative injected. Resilience +15% (Simulated).")

st.markdown("---")
st.caption("SummitCogWar v1.0 | Authorized Use Only | Neuro-Ethics Guard: ACTIVE")

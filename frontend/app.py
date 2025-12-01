import streamlit as st
import requests
import pandas as pd

# This should point to the FastAPI backend
API_URL = "http://127.0.0.1:8000/api/v1/iocs"

st.set_page_config(page_title="SummitThreat", layout="wide")

st.title("SummitThreat: Open-Source Threat Intelligence")

st.header("Latest Threat Intelligence Pulses")

try:
    response = requests.get(API_URL, timeout=5)
    response.raise_for_status()
    data = response.json()

    if data["iocs"]:
        df = pd.DataFrame(data["iocs"])
        st.dataframe(df)
    else:
        st.warning("No IOCs found. The backend might be updating.")

except requests.exceptions.RequestException as e:
    st.error(f"Could not connect to the SummitThreat API. Is the backend running? Error: {e}")

st.sidebar.header("About")
st.sidebar.info(
    "SummitThreat is a next-generation, open-source threat intelligence platform designed to "
    "provide real-time, predictive, and actionable insights into the global threat landscape."
)

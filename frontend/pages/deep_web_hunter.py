import streamlit as st
import requests
import pandas as pd

# This should point to the FastAPI backend
API_URL = "http://127.0.0.1:8000/api/v1/deep-web"

st.set_page_config(page_title="Deep Web Hunter", layout="wide")

st.title("Multilingual Deep Web Hunter")

st.warning("Ethical Guidelines: The data presented in this module is for research and defensive purposes only. Do not attempt to access the sources directly. Do not engage with the actors. All data is collected passively and legally.")

try:
    response = requests.get(API_URL, timeout=5)
    response.raise_for_status()
    data = response.json()

    if data["findings"]:
        df = pd.DataFrame(data["findings"])
        st.dataframe(df)
    else:
        st.warning("No findings to display.")

except requests.exceptions.RequestException as e:
    st.error(f"Could not connect to the SummitThreat API. Is the backend running? Error: {e}")

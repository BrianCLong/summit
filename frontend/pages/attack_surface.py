import streamlit as st
import requests
import pandas as pd

# This should point to the FastAPI backend
API_URL = "http://127.0.0.1:8000/api/v1/attack-surface"

st.set_page_config(page_title="Attack Surface", layout="wide")

st.title("Autonomous Attack Surface Emulator")

try:
    response = requests.get(API_URL, timeout=5)
    response.raise_for_status()
    data = response.json()

    if data["assets"]:
        for asset in data["assets"]:
            st.header(f"{asset['name']} ({asset['type']})")
            st.subheader("Asset Details")
            st.json(asset)

            st.subheader("Vulnerabilities")
            if asset["vulnerabilities"]:
                df = pd.DataFrame(asset["vulnerabilities"])
                st.dataframe(df)
            else:
                st.success("No vulnerabilities found for this asset.")
            st.divider()

    else:
        st.warning("No assets found.")

except requests.exceptions.RequestException as e:
    st.error(f"Could not connect to the SummitThreat API. Is the backend running? Error: {e}")

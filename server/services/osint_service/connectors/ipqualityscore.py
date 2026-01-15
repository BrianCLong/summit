import os

import requests
from dotenv import load_dotenv

load_dotenv()

IPQUALITYSCORE_API_KEY = os.getenv("IPQUALITYSCORE_API_KEY")


def get_ip_reputation(ip_address: str):
    """
    Gets the reputation of an IP address from IPQualityScore.
    """
    if not IPQUALITYSCORE_API_KEY:
        return {"error": "IPQualityScore API key not configured"}

    url = f"https://www.ipqualityscore.com/api/json/ip/{IPQUALITYSCORE_API_KEY}/{ip_address}"
    try:
        response = requests.get(url, timeout=10)
        response.raise_for_status()
        return response.json()
    except requests.RequestException as e:
        return {"error": str(e)}

import os

import requests
from dotenv import load_dotenv

load_dotenv()

IPINFO_API_KEY = os.getenv("IPINFO_API_KEY")


def get_ip_info(ip_address: str):
    """
    Gets information about an IP address from IPInfo.
    """
    if not IPINFO_API_KEY:
        return {"error": "IPInfo API key not configured"}

    url = f"https://ipinfo.io/{ip_address}/json?token={IPINFO_API_KEY}"
    try:
        response = requests.get(url, timeout=10)
        response.raise_for_status()
        return response.json()
    except requests.RequestException as e:
        return {"error": str(e)}

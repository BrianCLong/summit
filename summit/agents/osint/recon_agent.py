from __future__ import annotations
import json
import urllib.request
import urllib.parse
import ssl
from typing import Dict, List, Optional
from summit.flags import is_feature_enabled

class ReconAgent:
    def __init__(self, name: str, allowed_tools: List[str]):
        self.name = name
        self.allowed_tools = allowed_tools
        self.enabled = is_feature_enabled("OSINT_RECON_ENABLED", default=False)

    def process(self, inputs: Dict) -> Dict:
        if not self.enabled:
            return {
                "action": "skip",
                "reason": "feature_flag_disabled",
                "recommendation": None
            }

        target = inputs.get("target")
        if not target:
             return {"error": "Target domain required"}

        subdomains = self.find_subdomains(target)
        return {
            "action": "report",
            "findings": {
                "subdomains": subdomains
            }
        }

    def find_subdomains(self, domain: str) -> List[str]:
        # Implementation using crt.sh
        url = f"https://crt.sh/?q=%.{domain}&output=json"
        try:
             # Use unverified context to avoid SSL issues in some environments, though ideally verify
             context = ssl.create_default_context()
             context.check_hostname = False
             context.verify_mode = ssl.CERT_NONE

             with urllib.request.urlopen(url, context=context, timeout=10) as response:
                 if response.status == 200:
                     content = response.read().decode('utf-8')
                     try:
                        data = json.loads(content)
                     except json.JSONDecodeError:
                        return []

                     # Extract unique name_values
                     names = set()
                     for entry in data:
                         name_value = entry.get('name_value')
                         if name_value:
                             # name_value can be multi-line
                             for n in name_value.split('\n'):
                                 names.add(n.strip())
                     return sorted(list(names))
        except Exception as e:
             # In production, use logging
             print(f"Error querying crt.sh: {e}")
             return []
        return []

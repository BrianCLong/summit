from __future__ import annotations

import hashlib
import json
import time
from dataclasses import dataclass, field
from typing import Dict, List, Optional

@dataclass
class LicenseKey:
    id: str
    tier: str # "STARTER", "ENTERPRISE", "GALACTIC"
    features: List[str]
    valid_until: float
    signature: str

class LicenseManager:
    """
    Cryptographic license verification and feature gating.
    """
    def __init__(self, public_key: str):
        self.public_key = public_key
        self.active_license: Optional[LicenseKey] = None

    def load_license(self, license_str: str) -> bool:
        try:
            data = json.loads(license_str)
            # Mock signature verification
            expected_sig = hashlib.sha256(f"{data['id']}:{data['tier']}".encode()).hexdigest()
            if data['signature'] != expected_sig:
                raise ValueError("Invalid Signature")

            if data['valid_until'] < time.time():
                raise ValueError("License Expired")

            self.active_license = LicenseKey(**data)
            return True
        except Exception as e:
            print(f"License Load Error: {e}")
            return False

    def check_feature(self, feature_name: str) -> bool:
        if not self.active_license: return False
        return feature_name in self.active_license.features

class UsageMeter:
    """
    Tracks billable units for pay-as-you-go revenue.
    """
    def __init__(self):
        self.usage: Dict[str, float] = {
            "hyper_rows": 0.0,
            "agent_cycles": 0.0,
            "singularity_calls": 0.0
        }
        self.rates: Dict[str, float] = {
            "hyper_rows": 0.01,
            "agent_cycles": 1.00,
            "singularity_calls": 100.00
        }

    def track(self, metric: str, amount: float = 1.0):
        if metric in self.usage:
            self.usage[metric] += amount

    def generate_invoice(self) -> Dict[str, float]:
        total = 0.0
        line_items = {}
        for k, v in self.usage.items():
            cost = v * self.rates[k]
            line_items[k] = cost
            total += cost
        return {"total_usd": total, "breakdown": line_items}

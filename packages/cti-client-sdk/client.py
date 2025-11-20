"""
Cyber Threat Intelligence Client SDK
Python client for interacting with CTI platform APIs
"""

import requests
from typing import List, Dict, Optional, Any
from datetime import datetime


class CTIClient:
    """Client for Cyber Intel Service"""

    def __init__(self, base_url: str = "http://localhost:8000", api_key: Optional[str] = None):
        self.base_url = base_url.rstrip('/')
        self.api_key = api_key
        self.session = requests.Session()

        if api_key:
            self.session.headers.update({"Authorization": f"Bearer {api_key}"})

    def _make_request(self, method: str, endpoint: str, **kwargs) -> Dict[str, Any]:
        """Make HTTP request to API"""
        url = f"{self.base_url}{endpoint}"
        response = self.session.request(method, url, **kwargs)
        response.raise_for_status()
        return response.json()

    # Threat Intelligence
    def create_threat(self, title: str, description: str, severity: str, **kwargs) -> Dict:
        """Create new threat intelligence item"""
        data = {
            "title": title,
            "description": description,
            "severity": severity,
            **kwargs
        }
        return self._make_request("POST", "/api/v1/threats", json=data)

    def list_threats(self, severity: Optional[str] = None, limit: int = 100, offset: int = 0) -> List[Dict]:
        """List threat intelligence items"""
        params = {"limit": limit, "offset": offset}
        if severity:
            params["severity"] = severity
        return self._make_request("GET", "/api/v1/threats", params=params)

    def get_threat(self, threat_id: str) -> Dict:
        """Get specific threat intelligence item"""
        return self._make_request("GET", f"/api/v1/threats/{threat_id}")

    def search_threats(self, query: Optional[str] = None, **filters) -> List[Dict]:
        """Search threat intelligence"""
        data = {"query": query, **filters}
        return self._make_request("POST", "/api/v1/threats/search", json=data)

    # IOC Management
    def create_ioc(self, ioc_type: str, value: str, severity: str, confidence: int, **kwargs) -> Dict:
        """Create new IOC"""
        data = {
            "type": ioc_type,
            "value": value,
            "severity": severity,
            "confidence": confidence,
            **kwargs
        }
        return self._make_request("POST", "/api/v1/iocs", json=data)

    def list_iocs(self, ioc_type: Optional[str] = None, severity: Optional[str] = None,
                  limit: int = 100, offset: int = 0) -> List[Dict]:
        """List IOCs"""
        params = {"limit": limit, "offset": offset}
        if ioc_type:
            params["type"] = ioc_type
        if severity:
            params["severity"] = severity
        return self._make_request("GET", "/api/v1/iocs", params=params)

    def get_ioc(self, ioc_id: str) -> Dict:
        """Get specific IOC"""
        return self._make_request("GET", f"/api/v1/iocs/{ioc_id}")

    def enrich_ioc(self, ioc_id: str, providers: List[str]) -> Dict:
        """Enrich IOC with threat intelligence"""
        data = {"providers": providers}
        return self._make_request("POST", f"/api/v1/iocs/{ioc_id}/enrich", json=data)

    def bulk_import_iocs(self, iocs: List[Dict]) -> Dict:
        """Bulk import IOCs"""
        return self._make_request("POST", "/api/v1/iocs/bulk", json=iocs)

    # Threat Feeds
    def create_feed(self, name: str, url: str, source_type: str, **kwargs) -> Dict:
        """Register new threat feed"""
        data = {
            "name": name,
            "url": url,
            "source_type": source_type,
            **kwargs
        }
        return self._make_request("POST", "/api/v1/feeds", json=data)

    def list_feeds(self) -> List[Dict]:
        """List all threat feeds"""
        return self._make_request("GET", "/api/v1/feeds")

    def sync_feed(self, feed_id: str) -> Dict:
        """Trigger feed synchronization"""
        return self._make_request("POST", f"/api/v1/feeds/{feed_id}/sync")

    # Malware Analysis
    def submit_malware(self, file_hash: str, file_name: str, **kwargs) -> Dict:
        """Submit malware sample for analysis"""
        data = {
            "file_hash": file_hash,
            "file_name": file_name,
            **kwargs
        }
        return self._make_request("POST", "/api/v1/malware/submit", json=data)

    def get_malware_analysis(self, sample_id: str) -> Dict:
        """Get malware analysis results"""
        return self._make_request("GET", f"/api/v1/malware/{sample_id}")

    # Statistics
    def get_statistics(self) -> Dict:
        """Get platform statistics"""
        return self._make_request("GET", "/api/v1/statistics/overview")

    def get_trends(self, days: int = 30) -> Dict:
        """Get threat intelligence trends"""
        return self._make_request("GET", "/api/v1/statistics/trends", params={"days": days})


class ThreatHuntingClient:
    """Client for Threat Hunting Service"""

    def __init__(self, base_url: str = "http://localhost:8001", api_key: Optional[str] = None):
        self.base_url = base_url.rstrip('/')
        self.api_key = api_key
        self.session = requests.Session()

        if api_key:
            self.session.headers.update({"Authorization": f"Bearer {api_key}"})

    def _make_request(self, method: str, endpoint: str, **kwargs) -> Dict[str, Any]:
        """Make HTTP request to API"""
        url = f"{self.base_url}{endpoint}"
        response = self.session.request(method, url, **kwargs)
        response.raise_for_status()
        return response.json()

    # Threat Hunts
    def create_hunt(self, name: str, description: str, hypothesis: Dict, **kwargs) -> Dict:
        """Create and optionally execute a threat hunt"""
        data = {
            "name": name,
            "description": description,
            "hypothesis": hypothesis,
            **kwargs
        }
        return self._make_request("POST", "/api/v1/hunts", json=data)

    def list_hunts(self, status: Optional[str] = None, priority: Optional[str] = None) -> List[Dict]:
        """List threat hunts"""
        params = {}
        if status:
            params["status"] = status
        if priority:
            params["priority"] = priority
        return self._make_request("GET", "/api/v1/hunts", params=params)

    def get_hunt(self, hunt_id: str) -> Dict:
        """Get hunt details"""
        return self._make_request("GET", f"/api/v1/hunts/{hunt_id}")

    def execute_hunt(self, hunt_id: str) -> Dict:
        """Execute a threat hunt"""
        return self._make_request("POST", f"/api/v1/hunts/{hunt_id}/execute")

    def get_hunt_findings(self, hunt_id: str) -> List[Dict]:
        """Get findings from a hunt"""
        return self._make_request("GET", f"/api/v1/hunts/{hunt_id}/findings")

    # Playbooks
    def create_playbook(self, name: str, description: str, steps: List[Dict], **kwargs) -> Dict:
        """Create a hunting playbook"""
        data = {
            "name": name,
            "description": description,
            "steps": steps,
            **kwargs
        }
        return self._make_request("POST", "/api/v1/playbooks", json=data)

    def list_playbooks(self) -> List[Dict]:
        """List available playbooks"""
        return self._make_request("GET", "/api/v1/playbooks")

    def execute_playbook(self, playbook_id: str, parameters: Dict) -> Dict:
        """Execute a playbook"""
        return self._make_request("POST", f"/api/v1/playbooks/{playbook_id}/execute", json=parameters)

    # IOC Sweeping
    def sweep_iocs(self, iocs: List[str], scope: str = "all", lookback_hours: int = 24) -> Dict:
        """Sweep environment for IOCs"""
        data = {
            "iocs": iocs,
            "scope": scope,
            "lookback_hours": lookback_hours
        }
        return self._make_request("POST", "/api/v1/ioc-sweep", json=data)

    def get_sweep_status(self, sweep_id: str) -> Dict:
        """Get IOC sweep status"""
        return self._make_request("GET", f"/api/v1/ioc-sweep/{sweep_id}")

    # Behavioral Analysis
    def analyze_behavior(self, entity_id: str, entity_type: str, **kwargs) -> Dict:
        """Perform behavioral analysis on entity"""
        data = {
            "entity_id": entity_id,
            "entity_type": entity_type,
            **kwargs
        }
        return self._make_request("POST", "/api/v1/behavioral-analysis", json=data)

    # Statistics
    def get_statistics(self) -> Dict:
        """Get threat hunting statistics"""
        return self._make_request("GET", "/api/v1/statistics")


# Example usage
if __name__ == "__main__":
    # Initialize clients
    cti_client = CTIClient()
    hunt_client = ThreatHuntingClient()

    # Example: Create IOC
    ioc = cti_client.create_ioc(
        ioc_type="IP_ADDRESS",
        value="192.0.2.1",
        severity="HIGH",
        confidence=85,
        tags=["malware", "botnet"]
    )
    print(f"Created IOC: {ioc['id']}")

    # Example: Execute hunt
    hunt = hunt_client.create_hunt(
        name="Lateral Movement Detection",
        description="Hunt for lateral movement using SMB",
        hypothesis={
            "title": "Adversary using PsExec",
            "description": "Looking for remote execution via SMB",
            "assumptions": ["Adversary has valid credentials"],
            "data_sources": ["process_logs", "network_logs"],
            "priority": "HIGH"
        },
        auto_execute=True
    )
    print(f"Created hunt: {hunt['id']}")

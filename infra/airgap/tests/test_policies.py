#!/usr/bin/env python3
"""
Air-Gapped Deployment Policy Tests
Tests for validating security policies and configurations
"""

import json
import os
import re
import sys
from pathlib import Path

import pytest
import yaml


# Get the base directory for airgap configs
AIRGAP_DIR = Path(__file__).parent.parent
KUBERNETES_DIR = AIRGAP_DIR / "kubernetes"
SBOM_DIR = AIRGAP_DIR / "sbom"
TERRAFORM_DIR = AIRGAP_DIR / "terraform"


class TestNamespaceConfiguration:
    """Tests for Kubernetes namespace configuration"""

    @pytest.fixture
    def namespace_config(self):
        """Load namespace configuration"""
        config_path = KUBERNETES_DIR / "namespace.yaml"
        if not config_path.exists():
            pytest.skip(f"Namespace config not found: {config_path}")

        with open(config_path) as f:
            docs = list(yaml.safe_load_all(f))
        return docs

    def test_required_namespaces_exist(self, namespace_config):
        """Verify all required namespaces are defined"""
        required_namespaces = [
            "intelgraph-airgap",
            "intelgraph-scanning",
            "intelgraph-monitoring",
            "intelgraph-siem",
        ]

        defined_namespaces = [
            doc["metadata"]["name"]
            for doc in namespace_config
            if doc and doc.get("kind") == "Namespace"
        ]

        for ns in required_namespaces:
            assert ns in defined_namespaces, f"Missing namespace: {ns}"

    def test_pod_security_standards_enforced(self, namespace_config):
        """Verify Pod Security Standards are enforced"""
        for doc in namespace_config:
            if doc and doc.get("kind") == "Namespace":
                labels = doc.get("metadata", {}).get("labels", {})
                ns_name = doc["metadata"]["name"]

                # Check for PSS enforcement label
                assert (
                    "pod-security.kubernetes.io/enforce" in labels
                ), f"Missing PSS enforcement for {ns_name}"

    def test_security_zone_labels(self, namespace_config):
        """Verify security zone labels are applied"""
        for doc in namespace_config:
            if doc and doc.get("kind") == "Namespace":
                labels = doc.get("metadata", {}).get("labels", {})
                ns_name = doc["metadata"]["name"]

                # All namespaces should have a security zone label
                assert (
                    "security.intelgraph.io/zone" in labels
                    or "app.kubernetes.io/component" in labels
                ), f"Missing security zone label for {ns_name}"


class TestNetworkPolicies:
    """Tests for network policy configuration"""

    @pytest.fixture
    def network_policies(self):
        """Load network policy configuration"""
        config_path = KUBERNETES_DIR / "network-policies.yaml"
        if not config_path.exists():
            pytest.skip(f"Network policies not found: {config_path}")

        with open(config_path) as f:
            docs = list(yaml.safe_load_all(f))
        return [doc for doc in docs if doc]

    def test_default_deny_exists(self, network_policies):
        """Verify default-deny policies exist"""
        policy_names = [
            doc["metadata"]["name"]
            for doc in network_policies
            if doc.get("kind") == "NetworkPolicy"
        ]

        assert "default-deny-all" in policy_names, "Missing default-deny-all policy"

    def test_policies_specify_both_directions(self, network_policies):
        """Verify policies specify both ingress and egress"""
        for doc in network_policies:
            if doc.get("kind") == "NetworkPolicy":
                policy_types = doc.get("spec", {}).get("policyTypes", [])
                name = doc["metadata"]["name"]

                # Default deny should cover both directions
                if "default-deny" in name:
                    assert (
                        "Ingress" in policy_types
                    ), f"{name} missing Ingress in policyTypes"
                    assert (
                        "Egress" in policy_types
                    ), f"{name} missing Egress in policyTypes"

    def test_siem_no_egress(self, network_policies):
        """Verify SIEM namespace has no external egress"""
        for doc in network_policies:
            if doc.get("kind") == "NetworkPolicy":
                ns = doc["metadata"].get("namespace", "")
                if ns == "intelgraph-siem":
                    spec = doc.get("spec", {})
                    egress = spec.get("egress", [])

                    # SIEM should only egress to itself
                    for rule in egress:
                        for to in rule.get("to", []):
                            ns_selector = to.get("namespaceSelector", {})
                            labels = ns_selector.get("matchLabels", {})
                            # Should only allow egress to security-operations zone
                            if labels:
                                assert labels.get("security.intelgraph.io/zone") in [
                                    "security-operations",
                                    None,
                                ], "SIEM should not have external egress"


class TestMalwareScannerConfig:
    """Tests for malware scanner configuration"""

    @pytest.fixture
    def scanner_config(self):
        """Load malware scanner configuration"""
        config_path = KUBERNETES_DIR / "malware-scanning-station.yaml"
        if not config_path.exists():
            pytest.skip(f"Scanner config not found: {config_path}")

        with open(config_path) as f:
            docs = list(yaml.safe_load_all(f))
        return docs

    def test_multi_engine_scanning(self, scanner_config):
        """Verify multi-engine scanning is configured"""
        for doc in scanner_config:
            if doc and doc.get("kind") == "ConfigMap":
                data = doc.get("data", {})
                if "scanner-config.yaml" in data:
                    config = yaml.safe_load(data["scanner-config.yaml"])
                    engines = config.get("scanning", {}).get("engines", [])

                    # Require at least 2 engines for 91% reduction target
                    enabled_engines = [e for e in engines if e.get("enabled", True)]
                    assert (
                        len(enabled_engines) >= 2
                    ), "At least 2 scanning engines required"

    def test_quarantine_enabled(self, scanner_config):
        """Verify quarantine is enabled"""
        for doc in scanner_config:
            if doc and doc.get("kind") == "ConfigMap":
                data = doc.get("data", {})
                if "scanner-config.yaml" in data:
                    config = yaml.safe_load(data["scanner-config.yaml"])
                    quarantine = config.get("scanning", {}).get("quarantine", {})

                    assert quarantine.get("enabled", False), "Quarantine must be enabled"

    def test_block_on_detection(self, scanner_config):
        """Verify files are blocked on detection"""
        for doc in scanner_config:
            if doc and doc.get("kind") == "ConfigMap":
                data = doc.get("data", {})
                if "scanner-config.yaml" in data:
                    config = yaml.safe_load(data["scanner-config.yaml"])
                    thresholds = config.get("scanning", {}).get("thresholds", {})

                    assert thresholds.get(
                        "blockOnDetection", False
                    ), "Must block on detection"


class TestSLSASBOMPolicy:
    """Tests for SLSA and SBOM policy configuration"""

    @pytest.fixture
    def slsa_policy(self):
        """Load SLSA/SBOM policy configuration"""
        config_path = SBOM_DIR / "slsa-sbom-policy.yaml"
        if not config_path.exists():
            pytest.skip(f"SLSA policy not found: {config_path}")

        with open(config_path) as f:
            docs = list(yaml.safe_load_all(f))
        return docs

    def test_slsa_level_3_required(self, slsa_policy):
        """Verify SLSA Level 3 is required"""
        for doc in slsa_policy:
            if doc and doc.get("kind") == "ConfigMap":
                data = doc.get("data", {})
                if "policy.yaml" in data:
                    config = yaml.safe_load(data["policy.yaml"])
                    slsa = config.get("supplyChainPolicy", {}).get("slsa", {})

                    assert (
                        slsa.get("minimumLevel", 0) >= 3
                    ), "SLSA Level 3 minimum required"

    def test_sbom_required(self, slsa_policy):
        """Verify SBOM is required"""
        for doc in slsa_policy:
            if doc and doc.get("kind") == "ConfigMap":
                data = doc.get("data", {})
                if "policy.yaml" in data:
                    config = yaml.safe_load(data["policy.yaml"])
                    sbom = config.get("supplyChainPolicy", {}).get("sbom", {})

                    assert sbom.get("required", False), "SBOM must be required"

    def test_cosign_required(self, slsa_policy):
        """Verify cosign signing is required"""
        for doc in slsa_policy:
            if doc and doc.get("kind") == "ConfigMap":
                data = doc.get("data", {})
                if "policy.yaml" in data:
                    config = yaml.safe_load(data["policy.yaml"])
                    cosign = config.get("supplyChainPolicy", {}).get("cosign", {})

                    assert cosign.get("required", False), "Cosign signing must be required"

    def test_vulnerability_scanning_required(self, slsa_policy):
        """Verify vulnerability scanning is required"""
        for doc in slsa_policy:
            if doc and doc.get("kind") == "ConfigMap":
                data = doc.get("data", {})
                if "policy.yaml" in data:
                    config = yaml.safe_load(data["policy.yaml"])
                    vuln = (
                        config.get("supplyChainPolicy", {})
                        .get("sbom", {})
                        .get("vulnerabilityScanning", {})
                    )

                    assert vuln.get("required", False), "Vulnerability scanning required"
                    assert vuln.get(
                        "blockOnCritical", False
                    ), "Must block on critical vulns"


class TestSNMPMonitoring:
    """Tests for SNMP monitoring configuration"""

    @pytest.fixture
    def snmp_config(self):
        """Load SNMP monitoring configuration"""
        config_path = KUBERNETES_DIR / "snmp-monitoring.yaml"
        if not config_path.exists():
            pytest.skip(f"SNMP config not found: {config_path}")

        with open(config_path) as f:
            docs = list(yaml.safe_load_all(f))
        return docs

    def test_ot_sensor_module_exists(self, snmp_config):
        """Verify OT sensor module is configured"""
        for doc in snmp_config:
            if doc and doc.get("kind") == "ConfigMap":
                data = doc.get("data", {})
                if "snmp.yml" in data:
                    config = yaml.safe_load(data["snmp.yml"])
                    modules = config.get("modules", {})

                    assert "ot_sensor" in modules, "OT sensor module required"

    def test_critical_alerts_defined(self, snmp_config):
        """Verify critical alerts are defined"""
        for doc in snmp_config:
            if doc and doc.get("kind") == "PrometheusRule":
                groups = doc.get("spec", {}).get("groups", [])

                alert_names = []
                for group in groups:
                    for rule in group.get("rules", []):
                        if "alert" in rule:
                            alert_names.append(rule["alert"])

                required_alerts = ["SNMPTargetDown", "OTSensorOffline"]
                for alert in required_alerts:
                    assert alert in alert_names, f"Missing critical alert: {alert}"


class TestProxyChain:
    """Tests for proxy chain configuration"""

    @pytest.fixture
    def proxy_config(self):
        """Load proxy chain configuration"""
        config_path = KUBERNETES_DIR / "proxy-chain-sensor.yaml"
        if not config_path.exists():
            pytest.skip(f"Proxy config not found: {config_path}")

        with open(config_path) as f:
            docs = list(yaml.safe_load_all(f))
        return docs

    def test_multi_hop_configured(self, proxy_config):
        """Verify multi-hop proxy chain is configured"""
        for doc in proxy_config:
            if doc and doc.get("kind") == "ConfigMap":
                data = doc.get("data", {})
                if "proxy-chain.yaml" in data:
                    config = yaml.safe_load(data["proxy-chain.yaml"])
                    hops = config.get("proxyChain", {}).get("hops", [])

                    # Require at least 3 hops for defense in depth
                    assert len(hops) >= 3, "At least 3 proxy hops required"

    def test_mtls_required(self, proxy_config):
        """Verify mTLS is required at each hop"""
        for doc in proxy_config:
            if doc and doc.get("kind") == "ConfigMap":
                data = doc.get("data", {})
                if "proxy-chain.yaml" in data:
                    config = yaml.safe_load(data["proxy-chain.yaml"])
                    hops = config.get("proxyChain", {}).get("hops", [])

                    for hop in hops:
                        security = hop.get("security", {})
                        assert security.get("mtls", False), f"mTLS required for {hop['name']}"


class TestTerraformVariables:
    """Tests for Terraform variable configuration"""

    @pytest.fixture
    def terraform_vars(self):
        """Load Terraform variables"""
        config_path = TERRAFORM_DIR / "variables.tf"
        if not config_path.exists():
            pytest.skip(f"Terraform vars not found: {config_path}")

        with open(config_path) as f:
            content = f.read()
        return content

    def test_slsa_level_default(self, terraform_vars):
        """Verify SLSA level default is 3"""
        # Check for slsa_provenance_level variable with default 3
        assert (
            "slsa_provenance_level" in terraform_vars
        ), "Missing slsa_provenance_level variable"
        assert "default     = 3" in terraform_vars, "SLSA level should default to 3"

    def test_vpc_cidr_defined(self, terraform_vars):
        """Verify VPC CIDR is defined"""
        assert "vpc_cidr" in terraform_vars, "Missing vpc_cidr variable"

    def test_scanning_station_cidr_defined(self, terraform_vars):
        """Verify scanning station CIDR is defined"""
        assert (
            "scanning_station_cidr" in terraform_vars
        ), "Missing scanning_station_cidr variable"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])

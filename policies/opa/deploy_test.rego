package summit.deploy

test_allow {
  allow with input as {
    "artifacts_present": [
      "sbom.cdx.json",
      "sbom.cdx.sigstore.json",
      "provenance.slsa.json",
      "provenance.slsa.sigstore.json",
      "trivy.sbom.vuln.json",
      "deploy-gate-input.json",
      "opa-deploy-gate-decision.json"
    ],
    "signatures": {
      "sbom_valid": true,
      "provenance_valid": true
    },
    "vulnerabilities": {
      "critical": 0
    }
  }
}

test_deny_missing_artifact {
  not allow with input as {
    "artifacts_present": [
      "sbom.cdx.json"
    ],
    "signatures": {
      "sbom_valid": true,
      "provenance_valid": true
    },
    "vulnerabilities": {
      "critical": 0
    }
  }
}

test_deny_invalid_signature {
  not allow with input as {
    "artifacts_present": [
      "sbom.cdx.json",
      "sbom.cdx.sigstore.json",
      "provenance.slsa.json",
      "provenance.slsa.sigstore.json",
      "trivy.sbom.vuln.json",
      "deploy-gate-input.json",
      "opa-deploy-gate-decision.json"
    ],
    "signatures": {
      "sbom_valid": false,
      "provenance_valid": true
    },
    "vulnerabilities": {
      "critical": 0
    }
  }
}

test_deny_critical_vulns {
  not allow with input as {
    "artifacts_present": [
      "sbom.cdx.json",
      "sbom.cdx.sigstore.json",
      "provenance.slsa.json",
      "provenance.slsa.sigstore.json",
      "trivy.sbom.vuln.json",
      "deploy-gate-input.json",
      "opa-deploy-gate-decision.json"
    ],
    "signatures": {
      "sbom_valid": true,
      "provenance_valid": true
    },
    "vulnerabilities": {
      "critical": 1
    }
  }
}

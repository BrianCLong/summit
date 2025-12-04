package summit.sbom

import data.summit.sbom

test_sbom_ok_no_criticals {
  sbom.acceptable with input as {
    "components": [
      {
        "name": "lib-a",
        "version": "1.0.0",
        "purl": "pkg:npm/lib-a@1.0.0",
        "license": "MIT",
        "vulnerabilities": [
          {"id": "CVE-1", "severity": "MEDIUM"}
        ]
      }
    ]
  }
}

test_sbom_deny_criticals {
  not sbom.acceptable with input as {
    "components": [
      {
        "name": "lib-b",
        "version": "2.0.0",
        "purl": "pkg:npm/lib-b@2.0.0",
        "license": "Apache-2.0",
        "vulnerabilities": [
          {"id": "CVE-2", "severity": "CRITICAL"}
        ]
      }
    ]
  }
}

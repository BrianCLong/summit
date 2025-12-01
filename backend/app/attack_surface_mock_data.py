mock_assets = [
    {
        "id": "asset-001",
        "type": "Cloud Storage",
        "name": "summitthreat-customer-data-bucket",
        "platform": "AWS S3",
        "region": "us-east-1",
        "status": "Active",
        "vulnerabilities": [
            {
                "id": "vuln-001",
                "severity": "High",
                "description": "Publicly accessible S3 bucket.",
                "recommendation": "Restrict public access to the bucket."
            },
            {
                "id": "vuln-002",
                "severity": "Medium",
                "description": "Server-side encryption not enabled.",
                "recommendation": "Enable server-side encryption for the bucket."
            }
        ]
    },
    {
        "id": "asset-002",
        "type": "SaaS Application",
        "name": "Salesforce",
        "platform": "Salesforce",
        "status": "Active",
        "vulnerabilities": [
            {
                "id": "vuln-003",
                "severity": "Low",
                "description": "Two-factor authentication not enforced for all users.",
                "recommendation": "Enforce two-factor authentication for all users."
            }
        ]
    },
    {
        "id": "asset-003",
        "type": "IoT Device",
        "name": "Office Security Camera",
        "platform": "Generic IP Camera",
        "ip_address": "192.168.1.100",
        "status": "Active",
        "vulnerabilities": [
            {
                "id": "vuln-004",
                "severity": "Critical",
                "description": "Default credentials are being used.",
                "recommendation": "Change the default credentials immediately."
            }
        ]
    }
]

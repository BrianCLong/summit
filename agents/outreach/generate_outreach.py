import json
import os

TEMPLATE = """Subject: Detected drift risk in your org? 90s demo.

Hi {name},

I noticed your work at {company} in the SecOps space. With the 2026 Summit coming up, I wanted to share a 90s demo of Summit's Org Mesh Twin v1.

We've been tracking drift risks across enterprise meshes, and our latest GA release automates the detection and remediation of unauthorized infrastructure changes before they become incidents.

Would you be open to a quick 90s look at how we've solved this for other {industry} leaders?

Best,
Jules
Release Captain @ Summit"""

PROSPECTS = [
    {"name": "Alice Chen", "company": "CyberDyne Systems", "industry": "Defense", "role": "Head of SecOps"},
    {"name": "Bob Smith", "company": "Global Tech", "industry": "Technology", "role": "CISO"},
    {"name": "Charlie Davis", "company": "SecureNet", "industry": "Cybersecurity", "role": "VP Engineering"},
    {"name": "Diana Prince", "company": "Themyscira Solutions", "industry": "Government", "role": "Director of IT"},
    {"name": "Edward Norton", "company": "Fight Club Security", "industry": "Finance", "role": "Security Architect"},
    {"name": "Fiona Gallagher", "company": "South Side Systems", "industry": "Logistics", "role": "SecOps Manager"},
    {"name": "George Bluth", "company": "Banana Stand Tech", "industry": "Real Estate", "role": "CTO"},
    {"name": "Hannah Abbott", "company": "Hogwarts IT", "industry": "Education", "role": "Security Lead"},
    {"name": "Ian Wright", "company": "Arsenal Cyber", "industry": "Sports", "role": "Head of Digital"},
    {"name": "Jane Doe", "company": "Acme Corp", "industry": "Manufacturing", "role": "CISO"},
    {"name": "Kevin Flynn", "company": "ENCOM", "industry": "Entertainment", "role": "Founder"},
    {"name": "Laura Palmer", "company": "Twin Peaks Logging", "industry": "Forestry", "role": "IT Specialist"},
    {"name": "Michael Scott", "company": "Dunder Mifflin Cyber", "industry": "Paper & Tech", "role": "Regional Manager"},
    {"name": "Nina Sharp", "company": "Massive Dynamic", "industry": "Biotech", "role": "COO"},
    {"name": "Oscar Martinez", "company": "Scranton FinTech", "industry": "Finance", "role": "Chief Auditor"},
    {"name": "Peggy Carter", "company": "S.S.R. Cyber", "industry": "Intelligence", "role": "Director"},
    {"name": "Quentin Quire", "company": "X-Tech", "industry": "Mutant Rights", "role": "Chief Psionic"},
    {"name": "Riley Andersen", "company": "Mind Palace Inc", "industry": "Healthcare", "role": "Emotions Lead"},
    {"name": "Sarah Connor", "company": "Future Tech", "industry": "Resistance", "role": "Security Consultant"},
    {"name": "Tony Stark", "industry": "Aerospace", "company": "Stark Industries", "role": "CEO"}
]

def generate_emails():
    batch = []
    for prospect in PROSPECTS:
        email_content = TEMPLATE.format(
            name=prospect["name"],
            company=prospect["company"],
            industry=prospect["industry"]
        )
        batch.append({
            "recipient": prospect["name"],
            "company": prospect["company"],
            "email": email_content
        })

    output_path = "agents/outreach/output/outreach_batch_v1.json"
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    with open(output_path, "w") as f:
        json.dump(batch, f, indent=2)

    print(f"Generated {len(batch)} emails to {output_path}")

if __name__ == "__main__":
    generate_emails()

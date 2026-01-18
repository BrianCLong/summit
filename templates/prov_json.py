import json

def format_prov_json(entities, activities, agents, relations):
    """
    Formulates a W3C PROV-JSON document.
    """
    prov = {
        "prefix": {
            "summit": "https://summit.intelgraph/provenance/",
            "prov": "http://www.w3.org/ns/prov#"
        },
        "entity": entities or {},
        "activity": activities or {},
        "agent": agents or {},
        "wasGeneratedBy": {},
        "used": {},
        "wasAssociatedWith": {},
        "wasAttributedTo": {}
    }

    for rel in relations:
        rel_type = rel.get("type")
        rel_id = rel.get("id", f"_:{uuid_short()}")

        if rel_type == "wasGeneratedBy":
            prov["wasGeneratedBy"][rel_id] = {
                "prov:entity": rel["entity"],
                "prov:activity": rel["activity"]
            }
        elif rel_type == "used":
            prov["used"][rel_id] = {
                "prov:activity": rel["activity"],
                "prov:entity": rel["entity"]
            }
        elif rel_type == "wasAssociatedWith":
            prov["wasAssociatedWith"][rel_id] = {
                "prov:activity": rel["activity"],
                "prov:agent": rel["agent"]
            }

    return prov

def uuid_short():
    import uuid
    return str(uuid.uuid4())[:8]

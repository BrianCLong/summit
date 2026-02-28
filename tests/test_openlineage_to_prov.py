import json, pathlib
import pytest
from jsonschema import validate
from prov.model import ProvDocument, Namespace

SCHEMA = json.loads(pathlib.Path("schemas/openlineage-1.44-event.schema.json").read_text())
MAP = json.loads(pathlib.Path("mapping/openlineage_1.44_to_prov.json").read_text())

def to_prov(doc):
    p = ProvDocument()
    ex = Namespace('ex', 'https://example.org/')
    p.add_namespace(ex)
    run = doc["run"]
    job = doc["job"]
    act_id = f"ex:run/{run['runId']}"
    # Activity
    a = p.activity(act_id,
                   startTime=run.get("facets",{}).get("nominalStartTime"),
                   endTime=run.get("facets",{}).get("nominalEndTime"))
    # Entities (inputs/outputs)
    for d in doc.get("inputs", []):
        e = p.entity(f"ex:ds/{d['namespace']}/{d['name']}")
        p.used(a, e)
    for d in doc.get("outputs", []):
        e = p.entity(f"ex:ds/{d['namespace']}/{d['name']}")
        p.wasGeneratedBy(e, a)
    # Agent (optional)
    agent_uri = (doc.get("producer") or doc.get("owner"))
    if agent_uri:
        ag = p.agent(f"ex:agent/{hash(agent_uri)}", other_attributes={"ex:uri": agent_uri})
        p.wasAssociatedWith(a, ag)
    return p

def test_event_is_mappable_to_prov():
    sample_event_path = "events/sample_event.json"
    ev = json.loads(pathlib.Path(sample_event_path).read_text())

    # Check that this validates using standard openlineage validation
    if "RunEvent" in SCHEMA.get("$defs", {}):
        schema_to_use = {"$ref": "#/$defs/RunEvent"}
        schema_to_use.update(SCHEMA)
        validate(instance=ev, schema=schema_to_use)
    else:
        validate(instance=ev, schema=SCHEMA)

    prov_doc = to_prov(ev)

    assert prov_doc.get_records("activity"), "No PROV Activity created"
    assert prov_doc.get_records("entity"),   "No PROV Entity created"

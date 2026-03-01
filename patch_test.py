import re
with open("tests/test_openlineage_to_prov.py", "r") as f:
    data = f.read()

data = data.replace('from prov.model import ProvDocument, Namespace', 'from prov.model import ProvDocument, Namespace, ProvActivity, ProvEntity')

data = data.replace('assert prov_doc.get_records("activity")', 'assert prov_doc.get_records(ProvActivity)')
data = data.replace('assert prov_doc.get_records("entity")', 'assert prov_doc.get_records(ProvEntity)')

data = data.replace('run.get("facets",{}).get("nominalStartTime")', 'run.get("facets",{}).get("nominalTime", {}).get("nominalStartTime")')
data = data.replace('run.get("facets",{}).get("nominalEndTime")', 'run.get("facets",{}).get("nominalTime", {}).get("nominalEndTime")')

with open("tests/test_openlineage_to_prov.py", "w") as f:
    f.write(data)

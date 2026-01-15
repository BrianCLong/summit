import csv
import json
from io import StringIO


def export_data(data: dict, format: str):
    """
    Exports data to the specified format (JSON or CSV).
    """
    if format == "json":
        return json.dumps(data, indent=2)
    elif format == "csv":
        output = StringIO()
        writer = csv.writer(output)
        for key, value in data.items():
            writer.writerow([key, value])
        return output.getvalue()
    else:
        return {"error": "Unsupported format"}

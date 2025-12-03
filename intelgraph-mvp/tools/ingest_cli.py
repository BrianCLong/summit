import click
import json

import requests

MAPPING = {
    "person.name": "person_name",
    "person.email": "person_email",
    "person.phone": "person_phone",
    "org.name": "org_name",
    "event.name": "event_name",
    "event.occurred_at": "event_time",
    "location.name": "location_name",
    "location.lat": "lat",
    "location.lon": "lon",
    "document.title": "doc_title",
    "document.url": "doc_url",
}


@click.command()
@click.option("--file", "file_path", required=True)
@click.option("--tenant", required=True)
@click.option("--case", required=True)
@click.option("--token", required=True, help="JWT token")
@click.option("--api-url", default="http://localhost:8000")
@click.option("--source", default="csv")
@click.option("--license", default="CC0")
@click.option("--sensitivity", default="T")
@click.option("--clearance", default="analyst")
def main(file_path, tenant, case, token, api_url, source, license, sensitivity, clearance):
    headers = {"Authorization": f"Bearer {token}", "X-Tenant-ID": tenant, "X-Case-ID": case}
    data = {
        "mapping": json.dumps(MAPPING),
        "provenance": json.dumps({"source": source, "license": license}),
        "policy": json.dumps(
            {"sensitivity": sensitivity, "clearance": [c.strip() for c in clearance.split(",")]}
        ),
    }
    with open(file_path, "rb") as handle:
        files = {"file": handle}
        resp = requests.post(f"{api_url}/ingest/csv", files=files, data=data, headers=headers)
    click.echo(resp.status_code)
    if resp.text:
        click.echo(resp.text)


if __name__ == "__main__":
    main()

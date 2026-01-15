import json

import strawberry

from . import disclosure, evidence, provenance
from .exporters import prov_json


@strawberry.type
class EvidenceType:
    id: strawberry.ID
    kind: str
    title: str | None
    url: str | None
    hash: str | None
    created_at: str | None


@strawberry.type
class BundleType:
    bundle_id: strawberry.ID
    root: str
    manifest_json: str


@strawberry.type
class ProvenanceNode:
    id: str
    label: str
    props: str


@strawberry.type
class ProvenanceEdge:
    source: str
    target: str
    relation: str


@strawberry.type
class ProvenanceType:
    nodes: list[ProvenanceNode]
    edges: list[ProvenanceEdge]


@strawberry.type
class Query:
    @strawberry.field
    def provenance_by_id(self, id: strawberry.ID) -> ProvenanceType | None:
        # Tries to find subgraph for claim or evidence
        graph = provenance.subgraph_for_claim(str(id))
        export = prov_json.export(graph)
        nodes = [
            ProvenanceNode(id=n["id"], label=n["label"], props=json.dumps(n))
            for n in export["nodes"]
        ]
        edges = [
            ProvenanceEdge(source=e["source"], target=e["target"], relation=e["label"])
            for e in export["edges"]
        ]
        return ProvenanceType(nodes=nodes, edges=edges)


@strawberry.type
class Mutation:
    @strawberry.mutation
    def register_evidence(
        self, kind: str, url: str | None = None, title: str | None = None
    ) -> EvidenceType:
        evid = evidence.register_evidence(kind, url=url, title=title)
        provenance.add_evidence(evid)
        return EvidenceType(
            id=strawberry.ID(evid["id"]),
            kind=evid["kind"],
            title=evid.get("title"),
            url=evid.get("url"),
            hash=evid.get("hash"),
            created_at=evid.get("created_at"),
        )

    @strawberry.mutation
    def create_disclosure_bundle(self, claim_ids: list[strawberry.ID]) -> BundleType:
        bundle = disclosure.build_bundle([str(cid) for cid in claim_ids])
        manifest = bundle["manifest"]
        return BundleType(
            bundle_id=strawberry.ID(bundle["bundle_id"]),
            root=manifest["root"],
            manifest_json=json.dumps(manifest),
        )


schema = strawberry.Schema(query=Query, mutation=Mutation)

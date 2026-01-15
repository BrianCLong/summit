import json
import logging
from dataclasses import dataclass

import betterproto
from grpclib.const import Cardinality, Handler
from grpclib.server import Stream

from . import evidence, provenance
from .exporters import prov_json

logger = logging.getLogger(__name__)


@dataclass
class RegisterEvidenceRequest(betterproto.Message):
    kind: str = betterproto.string_field(1)
    url: str = betterproto.string_field(2)
    title: str = betterproto.string_field(3)


@dataclass
class EvidenceResponse(betterproto.Message):
    id: str = betterproto.string_field(1)
    kind: str = betterproto.string_field(2)
    title: str = betterproto.string_field(3)
    url: str = betterproto.string_field(4)
    hash: str = betterproto.string_field(5)


@dataclass
class GetProvenanceRequest(betterproto.Message):
    id: str = betterproto.string_field(1)


@dataclass
class ProvenanceResponse(betterproto.Message):
    json_graph: str = betterproto.string_field(1)


class ProvenanceService:
    async def register_evidence(self, stream: Stream) -> None:
        request = await stream.recv_message()
        logger.info(f"gRPC RegisterEvidence: {request.kind}, {request.url}")
        evid = evidence.register_evidence(request.kind, url=request.url, title=request.title)
        provenance.add_evidence(evid)
        response = EvidenceResponse(
            id=evid["id"],
            kind=evid["kind"],
            title=evid.get("title") or "",
            url=evid.get("url") or "",
            hash=evid.get("hash") or "",
        )
        await stream.send_message(response)

    async def get_provenance(self, stream: Stream) -> None:
        request = await stream.recv_message()
        logger.info(f"gRPC GetProvenance: {request.id}")
        graph = provenance.subgraph_for_claim(request.id)
        export = prov_json.export(graph)
        response = ProvenanceResponse(json_graph=json.dumps(export))
        await stream.send_message(response)

    def __mapping__(self):
        return {
            "/provenance.ProvenanceService/RegisterEvidence": Handler(
                self.register_evidence,
                Cardinality.UNARY_UNARY,
                RegisterEvidenceRequest,
                EvidenceResponse,
            ),
            "/provenance.ProvenanceService/GetProvenance": Handler(
                self.get_provenance,
                Cardinality.UNARY_UNARY,
                GetProvenanceRequest,
                ProvenanceResponse,
            ),
        }

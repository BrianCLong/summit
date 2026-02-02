from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Dict, List, Optional
from summit.tools.risk import get_tool_risk, ToolRisk


@dataclass
class PalantirOntologyObject:
    object_type_id: str
    display_name: str
    properties: Dict[str, str]  # name -> type

@dataclass
class PalantirOntologyLink:
    api_name: str
    display_name: str
    source_object_type: str
    target_object_type: str
    cardinality: str

@dataclass
class SummitGraphSchema:
    nodes: List[Dict[str, Any]]
    edges: List[Dict[str, Any]]
    actions: List[Dict[str, Any]] = None

@dataclass
class SummitTool:
    name: str
    description: str
    risk: ToolRisk
    config: Dict[str, Any]

@dataclass
class FoundryDataset:
    rid: str
    alias: str
    schema: Dict[str, str]
    inputs: List[str]


class PalantirImporter:
    """
    Importer for Palantir Ontology definitions (Objects + Links + Actions) into Summit Graph Schema.
    """

    def __init__(self, config: Dict[str, Any]):
        self.config = config

    def validate_ontology(self, ontology_json: Dict[str, Any]) -> bool:
        """
        Validates that the provided JSON matches expected Palantir Ontology export format.
        """
        if "objectTypes" not in ontology_json:
            return False
        return True

    def import_actions(self, ontology_json: Dict[str, Any]) -> List[SummitTool]:
        """
        Parses Palantir 'actionTypes' and maps them to SummitTools with Risk Assessment.
        """
        tools = []
        for action in ontology_json.get("actionTypes", []):
            name = action.get("apiName")

            # Map Palantir logic to generic risk
            # E.g., if it deletes objects, it's HIGH risk
            risk = ToolRisk.LOW
            logic = action.get("logicRules", [])

            # Simple heuristic for demo purposes
            if "delete" in str(logic).lower() or "delete" in name.lower():
                risk = ToolRisk.HIGH
            elif "modify" in str(logic).lower():
                risk = ToolRisk.MEDIUM

            tools.append(SummitTool(
                name=name,
                description=action.get("description", ""),
                risk=risk,
                config=action
            ))
        return tools

    def import_datasets(self, dataset_json: List[Dict[str, Any]]) -> List[FoundryDataset]:
        """
        Imports Foundry Dataset definitions.
        """
        datasets = []
        for ds in dataset_json:
            schema_map = {}
            for field in ds.get("schema", {}).get("fields", []):
                schema_map[field["name"]] = field["type"]

            datasets.append(FoundryDataset(
                rid=ds.get("rid", "unknown"),
                alias=ds.get("alias", "unknown"),
                schema=schema_map,
                inputs=ds.get("provenance", {}).get("input_rids", [])
            ))
        return datasets

    def import_ontology(self, ontology_json: Dict[str, Any]) -> SummitGraphSchema:
        """
        Converts Palantir Ontology (Objects + Links) to Summit Graph Schema.
        """
        if not self.validate_ontology(ontology_json):
            raise ValueError("Invalid Palantir Ontology JSON")

        nodes = []
        valid_types = set()
        for obj_type in ontology_json.get("objectTypes", []):
            api_name = obj_type.get("apiName")
            valid_types.add(api_name)
            nodes.append({
                "type": "node_definition",
                "label": api_name,
                "display_name": obj_type.get("display_name"),
                "properties": obj_type.get("properties", {})
            })

        edges = []
        for link_type in ontology_json.get("linkTypes", []):
            src = link_type.get("sourceObjectType")
            tgt = link_type.get("targetObjectType")
            if src in valid_types and tgt in valid_types:
                edges.append({
                    "type": "edge_definition",
                    "label": link_type.get("apiName"),
                    "display_name": link_type.get("display_name"),
                    "source_type": src,
                    "target_type": tgt,
                    "cardinality": link_type.get("cardinality", "MANY_TO_MANY")
                })

        # We don't return actions in the schema object itself usually,
        # but for completeness let's add the raw definitions if needed,
        # or just rely on import_actions()
        actions = self.import_actions(ontology_json)

        return SummitGraphSchema(nodes=nodes, edges=edges, actions=[a.__dict__ for a in actions])

from typing import List
from ..transport.base import MCPTransport
from .schema import Tool, Catalog
import json

class ToolSync:
    def __init__(self, transports: List[MCPTransport]):
        self.transports = transports

    def sync(self) -> Catalog:
        all_tools = []
        for transport in self.transports:
            # We assume transport returns raw dicts matching Tool schema
            raw_tools = transport.list_tools()
            for t in raw_tools:
                # Basic mapping using pydantic
                # Assuming raw_tools are dicts like {"name": "foo", "inputSchema": {...}}
                tool = Tool(**t)
                all_tools.append(tool)

        catalog = Catalog(tools=all_tools)
        catalog.rehash()
        return catalog

    def save_catalog(self, catalog: Catalog, path: str):
        with open(path, 'w') as f:
            f.write(catalog.model_dump_json(indent=2))

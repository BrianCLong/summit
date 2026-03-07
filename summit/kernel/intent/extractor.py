import os
import tree_sitter_python as tspython
from tree_sitter import Language, Parser, Query, QueryCursor
from typing import Dict, Any

from summit.kernel.intent.rules import match_intent_layer, match_intent_component

def extract_intent(path: str) -> Dict[str, Any]:
    try:
        with open(path, 'r', encoding='utf-8') as f:
            content = f.read()

        PY_LANGUAGE = Language(tspython.language())
        parser = Parser(PY_LANGUAGE)
        tree = parser.parse(bytes(content, "utf8"))

        query_str = """
        (import_statement) @import
        (import_from_statement) @import_from
        """

        query = Query(PY_LANGUAGE, query_str)
        cursor = QueryCursor(query)
        matches = list(cursor.matches(tree.root_node))

        imports = []
        for match in matches:
            # match is (pattern_index, {"capture_name": [Node, Node]})
            capture_dict = match[1]
            for capture_list in capture_dict.values():
                for node in capture_list:
                    imports.append(node.text.decode('utf8'))

        filename = os.path.basename(path)

        return {
            "component": match_intent_component(content, filename),
            "layer": match_intent_layer(content),
            "pattern": ["python_module"],
            "dependencies": imports,
            "evidence_id": "SUMMIT:INTENT:EXTRACTION:0001"
        }
    except Exception as e:
        import traceback
        return {
            "component": "unknown",
            "layer": "unknown",
            "pattern": [],
            "dependencies": [],
            "error": str(e),
            "evidence_id": "SUMMIT:INTENT:EXTRACTION:ERROR",
            "traceback": traceback.format_exc()
        }

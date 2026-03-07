import tree_sitter_python as tspython
from tree_sitter import Language, Parser, Query, QueryCursor
from typing import Dict, Any

def compute_metrics(path: str) -> Dict[str, Any]:
    try:
        with open(path, 'r', encoding='utf-8') as f:
            content = f.read()

        lines = content.splitlines()
        loc = len(lines)

        PY_LANGUAGE = Language(tspython.language())
        parser = Parser(PY_LANGUAGE)
        tree = parser.parse(bytes(content, "utf8"))

        # Simple query for functions
        query_func = Query(PY_LANGUAGE, """
        (function_definition) @function
        """)
        cursor_func = QueryCursor(query_func)
        captures_func = list(cursor_func.matches(tree.root_node))
        function_count = len(captures_func)

        # Simple cyclomatic complexity approximation
        # (count if, for, while, try, except, with, and, or)
        query_complexity = Query(PY_LANGUAGE, """
        (if_statement) @if
        (for_statement) @for
        (while_statement) @while
        (try_statement) @try
        (except_clause) @except
        (with_statement) @with
        (boolean_operator) @bool
        """)
        cursor_complexity = QueryCursor(query_complexity)
        captures_complexity = list(cursor_complexity.matches(tree.root_node))
        complexity = len(captures_complexity) + 1 # Base complexity is 1

        return {
            "cyclomatic_complexity": complexity,
            "function_count": function_count,
            "loc": loc,
            "evidence_id": "SUMMIT:TRUST:METRICS:0001",
        }
    except Exception as e:
        import traceback
        return {
            "cyclomatic_complexity": -1,
            "function_count": -1,
            "loc": -1,
            "evidence_id": "SUMMIT:TRUST:METRICS:ERROR",
            "error": str(e),
            "traceback": traceback.format_exc()
        }

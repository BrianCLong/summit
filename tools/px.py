#!/usr/bin/env python3
"""
Perplexity Browser Integration Tool
Opens Perplexity with pre-formatted queries and context from IntelGraph project.
"""

import argparse
import pathlib
import subprocess
import sys
import urllib.parse
from typing import Any


class PerplexityIntegration:
    """Integration tool for opening Perplexity with IntelGraph context."""

    def __init__(self, browser_command: str = "open"):
        self.browser_command = browser_command
        self.perplexity_url = "https://www.perplexity.ai"

    def format_query_with_context(self, query: str, context_type: str | None = None) -> str:
        """Format query with relevant IntelGraph context."""
        # Add IntelGraph context to the query
        context_prefix = ""

        if context_type == "architecture":
            context_prefix = (
                "In the context of IntelGraph AI-augmented intelligence analysis platform: "
            )
        elif context_type == "neo4j":
            context_prefix = "For a Neo4j graph database in an intelligence analysis platform: "
        elif context_type == "react":
            context_prefix = (
                "For a React/GraphQL application in an intelligence analysis platform: "
            )
        elif context_type == "ai":
            context_prefix = "For an AI/ML pipeline in an intelligence analysis platform: "
        elif context_type == "devops":
            context_prefix = "For DevOps and deployment of an intelligence analysis platform: "
        else:
            context_prefix = "For the IntelGraph intelligence analysis platform: "

        return context_prefix + query

    def get_project_context(self) -> dict[str, Any]:
        """Get current project context for enhanced queries."""
        context = {
            "project": "IntelGraph",
            "stack": ["React", "Node.js", "GraphQL", "Neo4j", "PostgreSQL", "Redis"],
            "focus": "AI-augmented intelligence analysis",
            "current_branch": None,
            "recent_files": [],
        }

        # Try to get git branch
        try:
            result = subprocess.run(
                ["git", "branch", "--show-current"], capture_output=True, text=True, timeout=5
            )
            if result.returncode == 0:
                context["current_branch"] = result.stdout.strip()
        except:
            pass

        # Try to get recently modified files
        try:
            result = subprocess.run(
                ["git", "diff", "--name-only", "HEAD~1"], capture_output=True, text=True, timeout=5
            )
            if result.returncode == 0:
                context["recent_files"] = result.stdout.strip().split("\n")[:5]
        except:
            pass

        return context

    def open_perplexity(self, query: str, new_chat: bool = True) -> bool:
        """Open Perplexity with the specified query."""
        try:
            if new_chat:
                # Open new chat with query
                encoded_query = urllib.parse.quote(query)
                url = f"{self.perplexity_url}/?q={encoded_query}"
            else:
                # Just open Perplexity
                url = self.perplexity_url

            # Open in browser
            if sys.platform == "darwin":  # macOS
                subprocess.run(["open", url], check=True)
            elif sys.platform == "win32":  # Windows
                subprocess.run(["start", url], shell=True, check=True)
            else:  # Linux
                subprocess.run(["xdg-open", url], check=True)

            print(f"✅ Opened Perplexity with query: {query[:60]}...")
            return True

        except subprocess.CalledProcessError as e:
            print(f"❌ Failed to open browser: {e}")
            return False
        except Exception as e:
            print(f"❌ Error opening Perplexity: {e}")
            return False

    def create_contextual_query(self, base_query: str, context_type: str = "auto") -> str:
        """Create a contextual query with project information."""
        if context_type == "auto":
            # Auto-detect context type based on query keywords
            query_lower = base_query.lower()
            if any(
                word in query_lower
                for word in ["neo4j", "cypher", "graph", "nodes", "relationships"]
            ):
                context_type = "neo4j"
            elif any(word in query_lower for word in ["react", "component", "jsx", "frontend"]):
                context_type = "react"
            elif any(
                word in query_lower
                for word in ["ai", "ml", "machine learning", "embedding", "model"]
            ):
                context_type = "ai"
            elif any(
                word in query_lower for word in ["deploy", "docker", "ci", "cd", "infrastructure"]
            ):
                context_type = "devops"
            else:
                context_type = "architecture"

        formatted_query = self.format_query_with_context(base_query, context_type)

        # Add project context
        project_context = self.get_project_context()
        if project_context.get("current_branch"):
            formatted_query += f" (working on branch: {project_context['current_branch']})"

        return formatted_query


def create_browser_workflow_tools():
    """Create additional browser workflow integration tools."""
    tools_dir = pathlib.Path(__file__).parent

    # Create Claude.ai integration
    claude_tool = tools_dir / "claude_web.py"
    if not claude_tool.exists():
        claude_code = '''#!/usr/bin/env python3
"""
Claude.ai Web Interface Integration
"""
import sys
import subprocess
import urllib.parse

def open_claude(query="", model="sonnet"):
    """Open Claude.ai with optional query."""
    base_url = "https://claude.ai/chat"
    
    if query:
        # Claude doesn't support URL parameters for queries, so just open with instructions
        print(f"Opening Claude.ai - paste this query: {query}")
    
    try:
        if sys.platform == "darwin":
            subprocess.run(["open", base_url], check=True)
        elif sys.platform == "win32":
            subprocess.run(["start", base_url], shell=True, check=True)
        else:
            subprocess.run(["xdg-open", base_url], check=True)
        return True
    except Exception as e:
        print(f"Error opening Claude: {e}")
        return False

if __name__ == "__main__":
    query = " ".join(sys.argv[1:]) if len(sys.argv) > 1 else ""
    open_claude(query)
'''
        claude_tool.write_text(claude_code)
        claude_tool.chmod(0o755)

    # Create Cursor integration
    cursor_tool = tools_dir / "cursor_web.py"
    if not cursor_tool.exists():
        cursor_code = '''#!/usr/bin/env python3
"""
Cursor Web Interface Integration
"""
import sys
import subprocess
import urllib.parse

def open_cursor_web(query=""):
    """Open Cursor web interface."""
    base_url = "https://cursor.sh"  # Adjust if cursor has web interface
    
    try:
        if sys.platform == "darwin":
            subprocess.run(["open", base_url], check=True)
        else:
            print("Cursor integration primarily for desktop app")
            return False
        return True
    except Exception as e:
        print(f"Error opening Cursor: {e}")
        return False

if __name__ == "__main__":
    query = " ".join(sys.argv[1:]) if len(sys.argv) > 1 else ""
    open_cursor_web(query)
'''
        cursor_tool.write_text(cursor_code)
        cursor_tool.chmod(0o755)

    print("✅ Created browser workflow tools")


def main():
    parser = argparse.ArgumentParser(description="Perplexity integration for IntelGraph")
    parser.add_argument("query", nargs="*", help="Query to search for")
    parser.add_argument(
        "--context",
        "-c",
        choices=["architecture", "neo4j", "react", "ai", "devops", "auto"],
        default="auto",
        help="Context type for query",
    )
    parser.add_argument(
        "--no-context", action="store_true", help="Don't add project context to query"
    )
    parser.add_argument(
        "--create-tools", action="store_true", help="Create additional browser workflow tools"
    )

    args = parser.parse_args()

    if args.create_tools:
        create_browser_workflow_tools()
        return 0

    if not args.query:
        print("Error: No query provided")
        parser.print_help()
        return 1

    query = " ".join(args.query)

    # Initialize integration
    px = PerplexityIntegration()

    # Format query with context if requested
    if not args.no_context:
        query = px.create_contextual_query(query, args.context)

    # Open Perplexity
    if px.open_perplexity(query):
        print(f"📱 Query sent to Perplexity: {query}")
        return 0
    else:
        return 1


if __name__ == "__main__":
    exit(main())

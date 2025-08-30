#!/usr/bin/env python3
"""
Browser AI Workflow Orchestrator for IntelGraph
Coordinates multiple browser-based AI tools and interfaces for maximum productivity.
"""
import sys
import json
import time
import argparse
import subprocess
import urllib.parse
from pathlib import Path
from typing import Dict, List, Optional, Any
from dataclasses import dataclass

@dataclass
class BrowserTool:
    """Configuration for a browser-based AI tool."""
    name: str
    base_url: str
    query_param: Optional[str] = None
    supports_direct_query: bool = False
    context_aware: bool = True
    description: str = ""

class BrowserAIOrchestrator:
    """Orchestrates multiple browser-based AI tools for IntelGraph development."""
    
    def __init__(self):
        self.tools = self._init_tools()
        self.context = self._get_project_context()
    
    def _init_tools(self) -> Dict[str, BrowserTool]:
        """Initialize available browser AI tools."""
        return {
            "perplexity": BrowserTool(
                name="Perplexity",
                base_url="https://www.perplexity.ai",
                query_param="q",
                supports_direct_query=True,
                description="AI-powered research and search"
            ),
            "claude": BrowserTool(
                name="Claude",
                base_url="https://claude.ai/chat",
                supports_direct_query=False,
                description="Anthropic's Claude AI assistant"
            ),
            "chatgpt": BrowserTool(
                name="ChatGPT",
                base_url="https://chatgpt.com",
                supports_direct_query=False,
                description="OpenAI's ChatGPT interface"
            ),
            "gemini": BrowserTool(
                name="Gemini",
                base_url="https://gemini.google.com",
                supports_direct_query=False,
                description="Google's Gemini AI"
            ),
            "comet": BrowserTool(
                name="Perplexity Comet",
                base_url="https://www.perplexity.ai/comet",
                query_param="q",
                supports_direct_query=True,
                description="Perplexity's Comet browser"
            ),
            "cursor": BrowserTool(
                name="Cursor",
                base_url="https://cursor.sh",
                supports_direct_query=False,
                description="AI-powered code editor"
            ),
            "github-copilot": BrowserTool(
                name="GitHub Copilot Chat",
                base_url="https://github.com/copilot",
                supports_direct_query=False,
                description="GitHub's AI coding assistant"
            ),
            "stackblitz": BrowserTool(
                name="StackBlitz",
                base_url="https://stackblitz.com",
                supports_direct_query=False,
                description="Online IDE with AI assistance"
            )
        }
    
    def _get_project_context(self) -> Dict[str, Any]:
        """Get comprehensive project context for AI interactions."""
        context = {
            "project_name": "IntelGraph",
            "description": "AI-augmented intelligence analysis platform",
            "tech_stack": [
                "React", "Node.js", "TypeScript", "GraphQL", 
                "Neo4j", "PostgreSQL", "Redis", "Docker"
            ],
            "ai_stack": [
                "Ollama", "LiteLLM", "OpenAI", "Anthropic", 
                "Embedding models", "RAG system"
            ],
            "current_branch": None,
            "recent_changes": [],
            "active_features": [],
            "architecture_focus": "Microservices, real-time collaboration, graph databases"
        }
        
        # Get git context
        try:
            # Current branch
            result = subprocess.run(
                ["git", "branch", "--show-current"],
                capture_output=True, text=True, timeout=5
            )
            if result.returncode == 0:
                context["current_branch"] = result.stdout.strip()
            
            # Recent changes
            result = subprocess.run(
                ["git", "log", "--oneline", "-5"],
                capture_output=True, text=True, timeout=5
            )
            if result.returncode == 0:
                context["recent_changes"] = [
                    line.strip() for line in result.stdout.strip().split('\n')[:3]
                ]
            
            # Modified files
            result = subprocess.run(
                ["git", "diff", "--name-only", "HEAD~1"],
                capture_output=True, text=True, timeout=5
            )
            if result.returncode == 0:
                modified_files = result.stdout.strip().split('\n')
                context["recent_files"] = [f for f in modified_files if f][:5]
                
        except Exception:
            pass
        
        return context
    
    def format_contextual_query(self, query: str, tool_name: str, context_level: str = "medium") -> str:
        """Format query with appropriate context for the target tool."""
        if context_level == "none":
            return query
        
        tool = self.tools.get(tool_name)
        if not tool or not tool.context_aware:
            return query
        
        # Build context prefix based on level
        context_parts = []
        
        if context_level in ["medium", "high"]:
            context_parts.append(f"For the {self.context['project_name']} project")
            context_parts.append(f"({self.context['description']})")
        
        if context_level == "high":
            if self.context.get("current_branch"):
                context_parts.append(f"on branch {self.context['current_branch']}")
            
            if self.context.get("recent_changes"):
                latest_commit = self.context["recent_changes"][0]
                context_parts.append(f"latest: {latest_commit}")
        
        # Add tech stack context for technical queries
        if any(tech in query.lower() for tech in ["code", "implement", "debug", "error", "api"]):
            tech_context = f"Tech stack: {', '.join(self.context['tech_stack'][:4])}"
            context_parts.append(tech_context)
        
        if context_parts:
            context_prefix = " - ".join(context_parts) + ": "
            return context_prefix + query
        
        return query
    
    def open_browser_tool(self, tool_name: str, query: str = "", context_level: str = "medium") -> bool:
        """Open a specific browser tool with optional query."""
        if tool_name not in self.tools:
            print(f"❌ Unknown tool: {tool_name}")
            print(f"Available tools: {', '.join(self.tools.keys())}")
            return False
        
        tool = self.tools[tool_name]
        
        # Format query with context
        if query and tool.context_aware:
            formatted_query = self.format_contextual_query(query, tool_name, context_level)
        else:
            formatted_query = query
        
        # Build URL
        url = tool.base_url
        if query and tool.supports_direct_query and tool.query_param:
            encoded_query = urllib.parse.quote(formatted_query)
            url = f"{url}?{tool.query_param}={encoded_query}"
        
        # Open browser
        try:
            if sys.platform == "darwin":  # macOS
                subprocess.run(["open", url], check=True)
            elif sys.platform == "win32":  # Windows  
                subprocess.run(["start", url], shell=True, check=True)
            else:  # Linux
                subprocess.run(["xdg-open", url], check=True)
            
            print(f"✅ Opened {tool.name}")
            if query:
                if tool.supports_direct_query:
                    print(f"📝 Query: {formatted_query[:80]}...")
                else:
                    print(f"📋 Copy this query: {formatted_query}")
            
            return True
            
        except Exception as e:
            print(f"❌ Failed to open {tool.name}: {e}")
            return False
    
    def open_multiple_tools(self, tools: List[str], query: str = "", 
                           context_level: str = "medium", delay: float = 1.0) -> Dict[str, bool]:
        """Open multiple browser tools with optional delay between opens."""
        results = {}
        
        for i, tool_name in enumerate(tools):
            if i > 0 and delay > 0:
                print(f"⏳ Waiting {delay}s before opening next tool...")
                time.sleep(delay)
            
            results[tool_name] = self.open_browser_tool(tool_name, query, context_level)
        
        return results
    
    def research_workflow(self, topic: str, deep_research: bool = False) -> bool:
        """Execute a research workflow across multiple AI tools."""
        print(f"🔍 Starting research workflow for: {topic}")
        
        # Format research query
        research_query = f"Research and analyze: {topic}"
        if self.context.get("current_branch"):
            research_query += f" (context: working on {self.context['current_branch']} branch)"
        
        # Define research tool sequence
        if deep_research:
            tools_sequence = ["perplexity", "claude", "gemini"]
            delay = 2.0
        else:
            tools_sequence = ["perplexity", "claude"]  
            delay = 1.0
        
        # Execute workflow
        results = self.open_multiple_tools(tools_sequence, research_query, "high", delay)
        
        # Report results
        successful = sum(1 for success in results.values() if success)
        print(f"📊 Research workflow: {successful}/{len(tools_sequence)} tools opened")
        
        return successful > 0
    
    def code_review_workflow(self, file_path: str = "") -> bool:
        """Execute a code review workflow."""
        print(f"👀 Starting code review workflow")
        
        # Build review query
        review_query = "Code review and analysis: "
        if file_path:
            review_query += f"focus on {file_path}"
        else:
            review_query += "recent changes"
        
        if self.context.get("recent_changes"):
            review_query += f" (recent commits: {self.context['recent_changes'][0]})"
        
        # Execute workflow
        tools_sequence = ["claude", "github-copilot"]
        results = self.open_multiple_tools(tools_sequence, review_query, "high", 1.5)
        
        successful = sum(1 for success in results.values() if success)
        print(f"✅ Code review workflow: {successful}/{len(tools_sequence)} tools opened")
        
        return successful > 0
    
    def architecture_design_workflow(self, component: str) -> bool:
        """Execute an architecture design workflow."""
        print(f"🏗️ Starting architecture design workflow for: {component}")
        
        design_query = f"Architecture design for {component} component in {self.context['project_name']}"
        design_query += f" (stack: {', '.join(self.context['tech_stack'][:3])})"
        
        # Use tools good for architectural discussions
        tools_sequence = ["claude", "perplexity", "gemini"]
        results = self.open_multiple_tools(tools_sequence, design_query, "high", 2.0)
        
        successful = sum(1 for success in results.values() if success)
        print(f"🏛️ Architecture workflow: {successful}/{len(tools_sequence)} tools opened")
        
        return successful > 0
    
    def list_tools(self) -> None:
        """List all available browser tools."""
        print("🛠️ Available Browser AI Tools:")
        print()
        
        for name, tool in self.tools.items():
            status = "✅" if tool.supports_direct_query else "📋"
            context = "🧠" if tool.context_aware else "⚪"
            print(f"  {status} {context} {name:<20} - {tool.description}")
        
        print()
        print("Legend:")
        print("  ✅ - Supports direct queries")
        print("  📋 - Manual query input required") 
        print("  🧠 - Context-aware")
        print("  ⚪ - Basic tool")

def main():
    parser = argparse.ArgumentParser(description="Browser AI Workflow Orchestrator")
    parser.add_argument("query", nargs="*", help="Query to process")
    
    # Tool selection
    parser.add_argument("--tool", "-t", help="Specific tool to open")
    parser.add_argument("--tools", nargs="+", help="Multiple tools to open")
    parser.add_argument("--list", "-l", action="store_true", help="List available tools")
    
    # Workflows
    parser.add_argument("--research", "-r", action="store_true", help="Execute research workflow")
    parser.add_argument("--code-review", action="store_true", help="Execute code review workflow")
    parser.add_argument("--architecture", "-a", help="Execute architecture design workflow")
    parser.add_argument("--deep", action="store_true", help="Use deep research mode (more tools)")
    
    # Context control
    parser.add_argument("--context", choices=["none", "low", "medium", "high"], 
                       default="medium", help="Context level to include")
    parser.add_argument("--delay", type=float, default=1.0, 
                       help="Delay between opening multiple tools")
    
    args = parser.parse_args()
    
    orchestrator = BrowserAIOrchestrator()
    
    if args.list:
        orchestrator.list_tools()
        return 0
    
    query = " ".join(args.query) if args.query else ""
    
    # Execute workflows
    if args.research:
        if not query:
            print("❌ Research workflow requires a query")
            return 1
        return 0 if orchestrator.research_workflow(query, args.deep) else 1
    
    if args.code_review:
        file_path = query if query else ""
        return 0 if orchestrator.code_review_workflow(file_path) else 1
    
    if args.architecture:
        component = args.architecture
        return 0 if orchestrator.architecture_design_workflow(component) else 1
    
    # Open specific tool(s)
    if args.tools:
        results = orchestrator.open_multiple_tools(args.tools, query, args.context, args.delay)
        successful = sum(1 for success in results.values() if success)
        return 0 if successful > 0 else 1
    
    if args.tool:
        return 0 if orchestrator.open_browser_tool(args.tool, query, args.context) else 1
    
    # Default: open Perplexity
    if query:
        return 0 if orchestrator.open_browser_tool("perplexity", query, args.context) else 1
    else:
        parser.print_help()
        return 1

if __name__ == "__main__":
    exit(main())
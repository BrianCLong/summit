#!/usr/bin/env python3
"""
IntelGraph Symphony CLI - Unified command palette with routing and autonomy
Usage: symphony <noun> <verb> [options]
"""

import argparse
import json
import os
import sys
import subprocess
import yaml
from pathlib import Path
from typing import Dict, Any, Optional
import requests
from datetime import datetime
import tools.overrides as overrides # Added
from tools.federation import load_federation_config # Added

# Configuration defaults
DEFAULT_CONFIG = {
    "profile": "dev",
    "autonomy": 1,  # 0:manual, 1:suggest, 2:auto-local, 3:allow-bursts
    "models": {
        "general": "local/llama",
        "code": "local/llama-cpu", 
        "graph": "local/llama",
        "embed": "nomic-embed-text"
    },
    "endpoints": {
        "litellm": "http://127.0.0.1:4000/v1",
        "ollama": "http://127.0.0.1:11434"
    },
    "caps": {
        "cost_usd": 5.0,
        "tokens": 100000,
        "runtime_s": 30,
        "temperature": 0.2
    }
}

class SymphonyConfig:
    def __init__(self):
        self.config = DEFAULT_CONFIG.copy()
        self.load_config()
    
    def load_config(self):
        """Load config from .orchestra.env and orchestration.yml"""
        # Load environment variables
        env_file = Path(".orchestra.env")
        if env_file.exists():
            with open(env_file) as f:
                for line in f:
                    if '=' in line and not line.startswith('#'):
                        key, val = line.strip().split('=', 1)
                        if key == "PROFILE":
                            self.config["profile"] = val
                        elif key == "AUTONOMY":
                            self.config["autonomy"] = int(val)
                        elif key == "RAG_TOPK":
                            self.config["rag_topk"] = int(val)
                        elif key == "ENV": # Assuming ENV can be set in .orchestra.env
                            self.config["env"] = val
        
        # Load YAML config
        yml_file = Path("orchestration.yml")
        if yml_file.exists():
            with open(yml_file) as f:
                yml_config = yaml.safe_load(f)
                if yml_config:
                    self._merge_config(yml_config)
    
    def _merge_config(self, yml_config):
        """Merge YAML config into current config"""
        if "defaults" in yml_config:
            defaults = yml_config["defaults"]
            if "model_general" in defaults:
                self.config["models"]["general"] = defaults["model_general"]
            if "model_code" in defaults:
                self.config["models"]["code"] = defaults["model_code"]
            if "model_graph" in defaults:
                self.config["models"]["graph"] = defaults["model_graph"]
            if "temperature" in defaults:
                self.config["caps"]["temperature"] = defaults["temperature"]
            if "autonomy" in defaults:
                self.config["autonomy"] = defaults["autonomy"]
        if "env" in yml_config: # Added
            self.config["env"] = yml_config["env"].get("name", self.config.get("env", "dev")) # Added
            self.config["kill_switch"] = yml_config["env"].get("kill_switch", 0) # Added

class SymphonyCLI:
    def __init__(self):
        self.config = SymphonyConfig()
        
    def log(self, msg: str, level: str = "info"):
        """Structured logging"""
        timestamp = datetime.utcnow().isoformat() + "Z"
        print(f"[{timestamp}] {level.upper()}: {msg}")
    
    def execute_llm_request(self, prompt: str, task_type: str = "general", **kwargs) -> Dict[str, Any]:
        """Execute LLM request with routing and caps"""
        model = self.config.config["models"][task_type]
        endpoint = self.config.config["endpoints"]["litellm"]
        
        payload = {
            "model": model,
            "messages": [
                {"role": "system", "content": f"Be concise and safe. Autonomy level: {self.config.config['autonomy']}."},
                {"role": "user", "content": prompt}
            ],
            "temperature": kwargs.get("temperature", self.config.config["caps"]["temperature"]),
            "max_tokens": kwargs.get("max_tokens", min(self.config.config["caps"]["tokens"], 2000))
        }
        
        try:
            response = requests.post(
                f"{endpoint}/chat/completions",
                headers={
                    "Authorization": "Bearer sk-anything",
                    "Content-Type": "application/json"
                },
                json=payload,
                timeout=self.config.config["caps"]["runtime_s"]
            )
            response.raise_for_status()
            return response.json()
        except Exception as e:
            return {"error": str(e)}
    
    def run_just_command(self, justfile: str, target: str, args: str = "", dry_run: bool = False):
        """Execute Just command with autonomy checks"""
        cmd = f"just --justfile {justfile} {target}"
        if args:
            cmd += f" {args}"
        
        if dry_run or self.config.config["autonomy"] == 0:
            print(f"DRY RUN: {cmd}")
            return True
        
        if self.config.config["autonomy"] == 1:
            confirm = input(f"Execute: {cmd}? [y/N] ").lower()
            if confirm != 'y':
                print("Aborted.")
                return False
        
        try:
            result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
            if result.returncode == 0:
                print(result.stdout)
                return True
            else:
                print(f"Error: {result.stderr}")
                return False
        except Exception as e:
            print(f"Failed to execute: {e}")
            return False
    
    def cmd_source(self, verb: str, **kwargs):
        """Source operations"""
        if verb == "list":
            print("Available sources:")
            print("- RAG corpus (rag/corpus/)")
            print("- Neo4j migrations (db/migrations/)")
            
        elif verb == "status":
            self.run_just_command("Justfile.rag", "rag-stats")
            
        elif verb == "refresh":
            self.run_just_command("Justfile.rag", "rag-rebuild", dry_run=kwargs.get("dry_run", False))
        
        else:
            print(f"Unknown source verb: {verb}")
    
    def cmd_pipeline(self, verb: str, **kwargs):
        """Pipeline operations"""
        if verb == "run":
            target = kwargs.get("target", "orchestra")
            if kwargs.get("smoke"):
                target = "orchestra-smoke"
            elif kwargs.get("fast"):
                target = "orchestra-fast"
            
            self.run_just_command("Justfile.orchestra", target, dry_run=kwargs.get("dry_run", False))
        
        elif verb == "status":
            subprocess.run(["python3", "tools/status_json.py"])
            
        else:
            print(f"Unknown pipeline verb: {verb}")
    
    def cmd_graph(self, verb: str, **kwargs):
        """Graph operations"""
        if verb == "query":
            query = kwargs.get("query")
            if not query:
                print("Error: --query required")
                return
            
            response = self.execute_llm_request(
                f"Generate Cypher query and explain reasoning for: {query}",
                task_type="graph"
            )
            
            if "error" in response:
                print(f"Error: {response['error']}")
            else:
                content = response.get("choices", [{}])[0].get("message", {}).get("content", "")
                print(content)
        
        elif verb == "status":
            self.run_just_command("Justfile.neo4j", "neo4j-status")
        
        elif verb == "guard":
            self.run_just_command("Justfile.neo4j", "neo4j-guard", dry_run=kwargs.get("dry_run", False))
        
        else:
            print(f"Unknown graph verb: {verb}")
    
    def cmd_orchestrator(self, verb: str, **kwargs):
        """Orchestrator operations"""
        if verb == "status":
            subprocess.run(["python3", "tools/status_json.py"])
            with open("dashboard/status.json") as f:
                status = json.load(f)
            
            # Load orchestration.yml to get triggers
            yml_file = Path("orchestration.yml")
            if yml_file.exists():
                with open(yml_file) as f:
                    yml_config = yaml.safe_load(f)
                    if yml_config and "triggers" in yml_config:
                        status["triggers"] = yml_config["triggers"]
            
            # Check federation.yml for federation status
            fed_config = load_federation_config()
            status["federation"] = {"enabled": bool(fed_config.get("peers"))}
            
            print(json.dumps(status, indent=2))
        
        elif verb == "tune":
            autonomy = kwargs.get("autonomy")
            if autonomy is not None:
                with open(".orchestra.env", "a") as f:
                    f.write(f"AUTONOMY={autonomy}\n")
                print(f"Set autonomy level to {autonomy}")
        
        else:
            print(f"Unknown orchestrator verb: {verb}")
    
    def cmd_route(self, verb: str, **kwargs):
        """Routing operations"""
        if verb == "decide":
            task = kwargs.get("task")
            ragk = kwargs.get("ragk")
            loa = kwargs.get("loa")
            env = kwargs.get("env") or self.config.config.get("env", "dev")
            
            # Policy check (from Section 3)
            # Determine if the model is hosted (for policy check)
            # This is a simplification; a real implementation would check against a list of hosted models
            hosted = 1 if model.startswith("cloud/") or model.startswith("gemini/") or model.startswith("xai/") else 0

            try:
                policy_cmd = ["python3", "tools/policy_check.py", "--env", env, "--loa", str(loa), "--hosted", str(hosted)]
                policy_process = subprocess.run(policy_cmd, capture_output=True, text=True, check=True)
                policy_allowed = True
                policy_memo = policy_process.stdout.strip()
            except subprocess.CalledProcessError as e:
                policy_allowed = False
                policy_memo = e.stdout.strip() if e.stdout else "Policy check: BLOCKED"
            except Exception as e:
                policy_allowed = False
                policy_memo = f"Policy check error: {e}"
            
            if not policy_allowed:
                print(json.dumps({"decision": "denied", "reason": policy_memo}, indent=2))
                return

            # Simple routing logic (will be expanded)
            model = "local/llama" # Default
            if task == "nl2cypher" and ragk == "high":
                model = "local/llama" # Example: keep local for high RAG
            elif env == "prod" and loa == 2:
                # Downgrade LOA for prod if it's too high
                loa = 1
                print(f"INFO: LOA downgraded to 1 for prod environment.")
            
            # More complex routing based on orchestration.yml (routes section)
            # This will be implemented later, for now simple logic
            
            print(json.dumps({"decision": "allowed", "model": model, "loa": loa, "env": env}, indent=2))
        else:
            print(f"Unknown route verb: {verb}")
    
    def cmd_policy(self, verb: str, **kwargs):
        """Policy operations"""
        if verb == "show":
            print(f"Current configuration:")
            print(f"  Profile: {self.config.config['profile']}")
            print(f"  Autonomy: {self.config.config['autonomy']}")
            print(f"  Models: {self.config.config['models']}")
            print(f"  Caps: {self.config.config['caps']}")
        
        elif verb == "tune":
            # Update configuration
            updated = False
            if kwargs.get("autonomy") is not None:
                self.config.config["autonomy"] = kwargs["autonomy"]
                updated = True
            
            if updated:
                print("Policy updated (in memory). Use --save to persist.")
        
        elif verb == "override":
            reason = kwargs.get("reason")
            downshift = kwargs.get("downshift")
            if reason and downshift is not None:
                overrides.record_override(reason, downshift)
            else:
                print("Error: --reason and --downshift are required for 'override' command.")
        
        elif verb == "suggest":
            log_file = kwargs.get("log_file")
            overrides.suggest_policy_tuning(log_file)
        
        else:
            print(f"Unknown policy verb: {verb}")

def main():
    parser = argparse.ArgumentParser(description="IntelGraph Symphony CLI")
    parser.add_argument("noun", choices=["source", "pipeline", "graph", "orchestrator", "policy", "route"], 
                       help="Resource type") # Added "route"
    parser.add_argument("verb", help="Action to perform")
    parser.add_argument("--dry-run", action="store_true", help="Show what would be done")
    parser.add_argument("--explain", action="store_true", help="Explain the action")
    parser.add_argument("--json", action="store_true", help="Output as JSON")
    parser.add_argument("--query", help="Query string for graph operations")
    parser.add_argument("--target", help="Target for pipeline operations")
    parser.add_argument("--smoke", action="store_true", help="Run smoke test")
    parser.add_argument("--fast", action="store_true", help="Run fast version")
    parser.add_argument("--autonomy", type=int, choices=[0, 1, 2, 3], help="Set autonomy level")
    parser.add_argument("--reason", type=str, help="Reason for policy override") # Added
    parser.add_argument("--downshift", type=int, choices=[1, 2, 3], help="Level of autonomy downshift (1-3)") # Added
    parser.add_argument("--from", dest="log_file", help="Path to override log file for 'suggest' command") # Added
    parser.add_argument("--ragk", type=str, help="RAG knowledge level (e.g., 'high', 'medium', 'low')") # Added
    parser.add_argument("--loa", type=int, choices=[0, 1, 2, 3], help="Level of Autonomy (0-3)") # Added
    parser.add_argument("--env", type=str, help="Environment (e.g., 'dev', 'prod')") # Added
    
    args = parser.parse_args()
    
    cli = SymphonyCLI()
    
    # Route to appropriate command handler
    method_name = f"cmd_{args.noun}"
    if hasattr(cli, method_name):
        method = getattr(cli, method_name)
        kwargs = {k: v for k, v in vars(args).items() if v is not None and k not in ["noun", "verb"]}
        method(args.verb, **kwargs)
    else:
        print(f"Unknown noun: {args.noun}")
        sys.exit(1)

if __name__ == "__main__":
    main()
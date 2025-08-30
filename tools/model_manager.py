#!/usr/bin/env python3
"""
IntelGraph Enhanced Model Management System
Intelligent model lifecycle management with resource monitoring and auto-updates.
"""
import json
import time
import psutil
import argparse
import subprocess
from pathlib import Path
from typing import Dict, List, Optional, Tuple, Any
from dataclasses import dataclass, asdict
from datetime import datetime, timedelta

@dataclass
class ModelInfo:
    """Information about an AI model."""
    name: str
    purpose: str
    priority: int
    size_gb: float
    provider: str = "ollama"
    aliases: List[str] = None
    last_used: Optional[str] = None
    install_date: Optional[str] = None
    update_available: bool = False

class ModelManager:
    """Enhanced model manager with intelligence and resource awareness."""
    
    def __init__(self, config_path: str = "tools/models.json", max_models: int = 5):
        self.config_path = Path(config_path)
        self.max_models = max_models
        self.min_free_gb = 2.0
        self.config = self._load_config()
        
    def _load_config(self) -> Dict[str, Any]:
        """Load or create model configuration."""
        if self.config_path.exists():
            try:
                with open(self.config_path) as f:
                    return json.load(f)
            except Exception as e:
                print(f"Warning: Could not load config: {e}")
        
        # Create default configuration
        default_config = {
            "models": {
                "qwen2.5-coder:7b": ModelInfo(
                    name="qwen2.5-coder:7b",
                    purpose="Primary coding assistant - optimized for IntelGraph development",
                    priority=1,
                    size_gb=4.2,
                    aliases=["local/llama", "coder"]
                ),
                "llama3.1:8b": ModelInfo(
                    name="llama3.1:8b", 
                    purpose="General reasoning and architectural decisions",
                    priority=2,
                    size_gb=4.7,
                    aliases=["local/llama-cpu", "architect"]
                ),
                "llama3.2:3b": ModelInfo(
                    name="llama3.2:3b",
                    purpose="Fast responses for quick queries",
                    priority=3,
                    size_gb=2.0,
                    aliases=["local/llama-small", "fast"]
                ),
                "nomic-embed-text": ModelInfo(
                    name="nomic-embed-text",
                    purpose="Text embeddings for RAG system",
                    priority=1,
                    size_gb=0.3,
                    aliases=["embeddings"]
                ),
                "deepseek-coder-v2:16b": ModelInfo(
                    name="deepseek-coder-v2:16b",
                    purpose="Advanced code generation and debugging",
                    priority=4,
                    size_gb=9.1,
                    aliases=["advanced-coder"]
                ),
                "llama3.2:1b": ModelInfo(
                    name="llama3.2:1b",
                    purpose="Ultra-lightweight for testing and CI/CD",
                    priority=5,
                    size_gb=0.7,
                    aliases=["tiny", "test"]
                )
            },
            "limits": {
                "max_concurrent": 3,
                "max_total_size_gb": 12.0,
                "min_free_memory_gb": 2.0,
                "auto_update_interval_hours": 24,
                "usage_tracking": True
            },
            "preferences": {
                "prefer_quantized": True,
                "auto_cleanup": True,
                "resource_monitoring": True
            }
        }
        
        # Convert ModelInfo objects to dicts for JSON serialization
        serializable_config = default_config.copy()
        serializable_config["models"] = {
            name: asdict(model) for name, model in default_config["models"].items()
        }
        
        # Create config directory if needed
        self.config_path.parent.mkdir(parents=True, exist_ok=True)
        
        # Save default config
        with open(self.config_path, 'w') as f:
            json.dump(serializable_config, f, indent=2)
        
        print(f"✅ Created default model configuration: {self.config_path}")
        return serializable_config
    
    def _save_config(self):
        """Save current configuration to file."""
        with open(self.config_path, 'w') as f:
            json.dump(self.config, f, indent=2)
    
    def get_system_resources(self) -> Tuple[float, float, float]:
        """Get current system resource usage (RAM GB, Disk GB, CPU %)."""
        # Memory
        memory = psutil.virtual_memory()
        ram_available_gb = memory.available / (1024**3)
        
        # Disk space
        disk = psutil.disk_usage('.')
        disk_available_gb = disk.free / (1024**3)
        
        # CPU
        cpu_percent = psutil.cpu_percent(interval=1)
        
        return ram_available_gb, disk_available_gb, cpu_percent
    
    def check_ollama_status(self) -> bool:
        """Check if Ollama service is running."""
        try:
            result = subprocess.run(
                ["ollama", "list"],
                capture_output=True, text=True, timeout=10
            )
            return result.returncode == 0
        except Exception:
            return False
    
    def get_installed_models(self) -> List[Dict[str, str]]:
        """Get list of currently installed models."""
        if not self.check_ollama_status():
            print("❌ Ollama service not available")
            return []
        
        try:
            result = subprocess.run(
                ["ollama", "list"],
                capture_output=True, text=True, timeout=10
            )
            
            if result.returncode != 0:
                return []
            
            models = []
            for line in result.stdout.strip().split('\n')[1:]:  # Skip header
                if line.strip():
                    parts = line.split()
                    if len(parts) >= 3:
                        models.append({
                            "name": parts[0],
                            "id": parts[1],
                            "size": parts[2],
                            "modified": " ".join(parts[3:]) if len(parts) > 3 else ""
                        })
            
            return models
            
        except Exception as e:
            print(f"Error getting installed models: {e}")
            return []
    
    def estimate_model_needs(self) -> List[str]:
        """Estimate which models should be installed based on current needs."""
        ram_gb, disk_gb, _ = self.get_system_resources()
        installed = {m["name"] for m in self.get_installed_models()}
        
        needed_models = []
        total_size = 0.0
        
        # Sort models by priority
        models = sorted(
            self.config["models"].items(),
            key=lambda x: x[1]["priority"]
        )
        
        for name, model_info in models:
            if name in installed:
                continue
                
            if len(needed_models) >= self.max_models:
                break
                
            size_gb = model_info["size_gb"]
            
            # Check if we have resources
            if total_size + size_gb > disk_gb - self.min_free_gb:
                print(f"⚠️ Skipping {name}: would exceed disk space")
                continue
                
            if size_gb > ram_gb - self.min_free_gb and model_info["priority"] > 2:
                print(f"⚠️ Skipping {name}: may cause memory issues")
                continue
            
            needed_models.append(name)
            total_size += size_gb
        
        return needed_models
    
    def install_model(self, model_name: str, timeout: int = 600) -> bool:
        """Install a specific model with timeout and progress tracking."""
        if not self.check_ollama_status():
            print("❌ Ollama service not available")
            return False
        
        print(f"📦 Installing {model_name}...")
        
        try:
            # Start installation
            process = subprocess.Popen(
                ["ollama", "pull", model_name],
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                universal_newlines=True
            )
            
            start_time = time.time()
            
            # Monitor progress
            while process.poll() is None:
                if time.time() - start_time > timeout:
                    process.kill()
                    print(f"❌ Installation timeout for {model_name}")
                    return False
                time.sleep(1)
            
            if process.returncode == 0:
                # Update config with install date
                if model_name in self.config["models"]:
                    self.config["models"][model_name]["install_date"] = datetime.now().isoformat()
                    self._save_config()
                
                print(f"✅ Successfully installed {model_name}")
                return True
            else:
                stderr = process.stderr.read() if process.stderr else "Unknown error"
                print(f"❌ Failed to install {model_name}: {stderr}")
                return False
                
        except Exception as e:
            print(f"❌ Error installing {model_name}: {e}")
            return False
    
    def update_model(self, model_name: str) -> bool:
        """Update a specific model to latest version."""
        print(f"🔄 Updating {model_name}...")
        return self.install_model(model_name)  # Pull command also updates
    
    def remove_model(self, model_name: str, force: bool = False) -> bool:
        """Remove a model with safety checks."""
        if not force:
            model_info = self.config["models"].get(model_name, {})
            if model_info.get("priority", 5) <= 2:
                print(f"⚠️ {model_name} is high priority. Use --force to remove.")
                return False
        
        try:
            result = subprocess.run(
                ["ollama", "rm", model_name],
                capture_output=True, text=True, timeout=30
            )
            
            if result.returncode == 0:
                print(f"✅ Removed {model_name}")
                return True
            else:
                print(f"❌ Failed to remove {model_name}: {result.stderr}")
                return False
                
        except Exception as e:
            print(f"❌ Error removing {model_name}: {e}")
            return False
    
    def auto_install_needed_models(self) -> Dict[str, bool]:
        """Automatically install needed models based on intelligence."""
        print("🤖 Auto-installing needed models...")
        
        needed = self.estimate_model_needs()
        results = {}
        
        if not needed:
            print("✅ All needed models already installed")
            return results
        
        print(f"📋 Will install: {', '.join(needed)}")
        
        for model_name in needed:
            results[model_name] = self.install_model(model_name)
        
        return results
    
    def cleanup_unused_models(self, dry_run: bool = False) -> List[str]:
        """Clean up models that haven't been used recently."""
        if not self.config.get("preferences", {}).get("auto_cleanup", False):
            print("🚫 Auto-cleanup disabled in preferences")
            return []
        
        installed = self.get_installed_models()
        cleanup_candidates = []
        
        for model in installed:
            model_name = model["name"]
            
            # Skip if it's a priority model
            model_info = self.config["models"].get(model_name, {})
            if model_info.get("priority", 5) <= 3:
                continue
            
            # Check last used (would need to track this)
            # For now, just identify very low priority models
            if model_info.get("priority", 5) >= 5:
                cleanup_candidates.append(model_name)
        
        if not cleanup_candidates:
            print("✅ No models need cleanup")
            return []
        
        if dry_run:
            print(f"🔍 Would cleanup: {', '.join(cleanup_candidates)}")
            return cleanup_candidates
        
        cleaned = []
        for model_name in cleanup_candidates:
            if self.remove_model(model_name):
                cleaned.append(model_name)
        
        return cleaned
    
    def health_check(self) -> Dict[str, Any]:
        """Comprehensive health check of the model ecosystem."""
        print("🏥 Running model ecosystem health check...")
        
        health = {
            "timestamp": datetime.now().isoformat(),
            "ollama_status": self.check_ollama_status(),
            "system_resources": {},
            "model_status": {},
            "recommendations": []
        }
        
        # System resources
        ram_gb, disk_gb, cpu_pct = self.get_system_resources()
        health["system_resources"] = {
            "ram_available_gb": round(ram_gb, 1),
            "disk_available_gb": round(disk_gb, 1),
            "cpu_percent": round(cpu_pct, 1)
        }
        
        # Model status
        installed = self.get_installed_models()
        needed = self.estimate_model_needs()
        
        health["model_status"] = {
            "installed_count": len(installed),
            "installed_models": [m["name"] for m in installed],
            "needed_models": needed,
            "missing_count": len(needed)
        }
        
        # Generate recommendations
        if not health["ollama_status"]:
            health["recommendations"].append("Start Ollama service")
        
        if ram_gb < 2:
            health["recommendations"].append("Low memory warning - consider closing applications")
        
        if disk_gb < 5:
            health["recommendations"].append("Low disk space - consider cleanup")
        
        if len(needed) > 0:
            health["recommendations"].append(f"Install {len(needed)} missing models")
        
        if len(installed) > self.max_models:
            health["recommendations"].append("Consider cleaning up unused models")
        
        return health
    
    def list_models(self, show_all: bool = False) -> None:
        """List models with status and recommendations."""
        print("📋 IntelGraph Model Status")
        print("=" * 50)
        
        installed = {m["name"]: m for m in self.get_installed_models()}
        
        for name, model_info in sorted(self.config["models"].items(), 
                                     key=lambda x: x[1]["priority"]):
            is_installed = name in installed
            status = "✅ Installed" if is_installed else "⭕ Available"
            priority = "⭐" * min(model_info["priority"], 5)
            
            print(f"\n{status} {name}")
            print(f"  Purpose: {model_info['purpose']}")
            print(f"  Priority: {priority} ({model_info['priority']})")
            print(f"  Size: {model_info['size_gb']}GB")
            
            if model_info.get("aliases"):
                print(f"  Aliases: {', '.join(model_info['aliases'])}")
            
            if is_installed:
                install_info = installed[name]
                print(f"  Modified: {install_info.get('modified', 'Unknown')}")
        
        if not show_all:
            print(f"\n💡 Use --show-all to see system resources and recommendations")
        else:
            health = self.health_check()
            print(f"\n🖥️ System Resources:")
            print(f"  RAM Available: {health['system_resources']['ram_available_gb']}GB")
            print(f"  Disk Available: {health['system_resources']['disk_available_gb']}GB")
            print(f"  CPU Usage: {health['system_resources']['cpu_percent']}%")
            
            if health["recommendations"]:
                print(f"\n💡 Recommendations:")
                for rec in health["recommendations"]:
                    print(f"  • {rec}")

def main():
    parser = argparse.ArgumentParser(description="IntelGraph Enhanced Model Manager")
    parser.add_argument("--config", default="tools/models.json",
                       help="Path to models configuration file")
    parser.add_argument("--max-models", type=int, default=5,
                       help="Maximum number of models to maintain")
    
    subparsers = parser.add_subparsers(dest="command", help="Available commands")
    
    # List command
    list_parser = subparsers.add_parser("list", help="List models and status")
    list_parser.add_argument("--show-all", action="store_true",
                            help="Show detailed system information")
    
    # Install command
    install_parser = subparsers.add_parser("install", help="Install specific model")
    install_parser.add_argument("model", help="Model name to install")
    install_parser.add_argument("--timeout", type=int, default=600,
                               help="Installation timeout in seconds")
    
    # Auto-install command
    subparsers.add_parser("auto-install", help="Auto-install needed models")
    
    # Update command
    update_parser = subparsers.add_parser("update", help="Update specific model")
    update_parser.add_argument("model", help="Model name to update")
    
    # Remove command
    remove_parser = subparsers.add_parser("remove", help="Remove specific model")
    remove_parser.add_argument("model", help="Model name to remove")
    remove_parser.add_argument("--force", action="store_true",
                              help="Force removal of high-priority models")
    
    # Cleanup command
    cleanup_parser = subparsers.add_parser("cleanup", help="Cleanup unused models")
    cleanup_parser.add_argument("--dry-run", action="store_true",
                               help="Show what would be cleaned up")
    
    # Health command
    subparsers.add_parser("health", help="Run comprehensive health check")
    
    args = parser.parse_args()
    
    if not args.command:
        parser.print_help()
        return 1
    
    # Initialize manager
    manager = ModelManager(args.config, args.max_models)
    
    # Execute commands
    try:
        if args.command == "list":
            manager.list_models(args.show_all)
            
        elif args.command == "install":
            success = manager.install_model(args.model, args.timeout)
            return 0 if success else 1
            
        elif args.command == "auto-install":
            results = manager.auto_install_needed_models()
            successful = sum(1 for success in results.values() if success)
            print(f"📊 Auto-install complete: {successful}/{len(results)} successful")
            return 0 if successful > 0 or len(results) == 0 else 1
            
        elif args.command == "update":
            success = manager.update_model(args.model)
            return 0 if success else 1
            
        elif args.command == "remove":
            success = manager.remove_model(args.model, args.force)
            return 0 if success else 1
            
        elif args.command == "cleanup":
            cleaned = manager.cleanup_unused_models(args.dry_run)
            if args.dry_run:
                print(f"🔍 Would cleanup {len(cleaned)} models")
            else:
                print(f"🧹 Cleaned up {len(cleaned)} models")
            return 0
            
        elif args.command == "health":
            health = manager.health_check()
            print(json.dumps(health, indent=2))
            return 0
            
    except KeyboardInterrupt:
        print("\n⚠️ Operation cancelled by user")
        return 1
    except Exception as e:
        print(f"❌ Error: {e}")
        return 1
    
    return 0

if __name__ == "__main__":
    exit(main())
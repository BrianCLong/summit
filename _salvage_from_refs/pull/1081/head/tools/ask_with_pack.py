#!/usr/bin/env python3
"""
Model-aware task router with bespoke prompting
Integrates capability matrix, scheduler, and prompt packs for optimal results
"""
import os, sys, json, time, yaml, http.client, pathlib
from datetime import datetime, timezone

ROOT = pathlib.Path(__file__).resolve().parents[1]
CAPS_FILE = ROOT / "models_caps.yml"

def load_capabilities():
    """Load model capabilities and task preferences"""
    if CAPS_FILE.exists():
        return yaml.safe_load(CAPS_FILE.read_text())
    else:
        # Fallback minimal config
        return {
            "providers": {
                "local/llama": {
                    "defaults": {"temperature": 0.2, "max_tokens": 1024},
                    "prompt_pack": "base"
                }
            },
            "tasks": {
                "interactive": {"preferred": ["local/llama"], "pack": "base"}
            }
        }

def load_template(pack):
    """Load system and user prompt templates for pack"""
    sys_path = ROOT / "prompts" / "packs" / f"{pack}.system.txt"
    usr_path = ROOT / "prompts" / "packs" / "common.user.txt"
    
    try:
        system = sys_path.read_text().strip()
    except FileNotFoundError:
        system = "You are a helpful assistant."
    
    try:
        user_template = usr_path.read_text().strip()
    except FileNotFoundError:
        user_template = "{{QUESTION}}\n\n{{CONTEXT}}\n{{RULES}}"
    
    return system, user_template

def render_template(template, **kwargs):
    """Render template with variable substitution"""
    output = template
    for key, value in kwargs.items():
        placeholder = "{{" + key + "}}"
        output = output.replace(placeholder, value if value is not None else "")
    return output

def choose_provider(task, override=None):
    """Choose optimal provider for task using scheduler integration"""
    caps = load_capabilities()
    
    # 1. Honor kill switch and scheduler decisions
    if not override:
        scheduler_path = ROOT / "tools" / "scheduler.py"
        if scheduler_path.exists():
            try:
                import subprocess
                result = subprocess.check_output([
                    sys.executable, str(scheduler_path), task, "1", "dev"
                ], text=True, timeout=10)
                
                scheduler_data = json.loads(result)
                suggested_provider = scheduler_data.get("provider")
                
                # Check if kill switch is active
                if scheduler_data.get("kill", False):
                    return suggested_provider or "local/llama"
                
                # Use scheduler suggestion if valid
                if suggested_provider and suggested_provider in caps["providers"]:
                    return suggested_provider
                    
            except Exception as e:
                print(f"Scheduler error: {e}", file=sys.stderr)
    
    # 2. Use explicit override
    if override:
        if override in caps["providers"]:
            return override
        else:
            print(f"Warning: Provider {override} not found in capabilities", file=sys.stderr)
    
    # 3. Use task preferences from capability matrix
    task_config = caps.get("tasks", {}).get(task, {})
    preferred_providers = task_config.get("preferred", [])
    
    for provider in preferred_providers:
        if provider in caps["providers"]:
            # Check if provider is actually available
            if is_provider_available(provider):
                return provider
    
    # 4. Fallback to first available local provider
    for provider_name, provider_config in caps["providers"].items():
        if provider_name.startswith("local/") and is_provider_available(provider_name):
            return provider_name
    
    # 5. Ultimate fallback
    return "local/llama"

def is_provider_available(provider):
    """Check if provider is actually available"""
    try:
        # Quick check to LiteLLM gateway
        conn = http.client.HTTPConnection("127.0.0.1", 4000, timeout=2)
        conn.request("GET", "/v1/models")
        resp = conn.getresponse()
        
        if resp.status == 200:
            models_data = json.loads(resp.read().decode())
            available_models = [m["id"] for m in models_data.get("data", [])]
            return provider in available_models
        
        conn.close()
    except Exception:
        pass
    
    # Assume local models are available by default
    return provider.startswith("local/")

def get_provider_config(provider):
    """Get defaults and prompt pack for provider"""
    caps = load_capabilities()
    provider_config = caps["providers"].get(provider, {})
    
    defaults = provider_config.get("defaults", {"temperature": 0.2, "max_tokens": 1024})
    prompt_pack = provider_config.get("prompt_pack", "base")
    
    return defaults, prompt_pack

def http_post_llm(payload):
    """Make HTTP request to LiteLLM gateway"""
    try:
        conn = http.client.HTTPConnection("127.0.0.1", 4000, timeout=120)
        body = json.dumps(payload).encode()
        
        headers = {
            "Content-Type": "application/json",
            "Authorization": "Bearer sk-anything"
        }
        
        conn.request("POST", "/v1/chat/completions", body, headers)
        response = conn.getresponse()
        response_data = response.read()
        conn.close()
        
        return json.loads(response_data.decode())
        
    except Exception as e:
        return {
            "error": f"HTTP request failed: {str(e)}",
            "choices": [{"message": {"content": f"Error: {str(e)}"}}]
        }

def log_usage(task, provider, success, latency_ms=None, tokens_used=None):
    """Log usage for ML optimization (optional)"""
    try:
        log_entry = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "task": task,
            "provider": provider,
            "success": success,
            "latency_ms": latency_ms,
            "tokens_used": tokens_used
        }
        
        log_file = ROOT / "logs" / "ask_with_pack.jsonl"
        log_file.parent.mkdir(exist_ok=True)
        
        with open(log_file, "a") as f:
            f.write(json.dumps(log_entry) + "\n")
            
    except Exception:
        pass  # Don't fail on logging errors

def main():
    if len(sys.argv) < 3:
        print("Usage: ask_with_pack.py <task> <question> [RULES='...'] [CONTEXT='...'] [MODEL='...']", file=sys.stderr)
        print("\nExamples:")
        print("  ask_with_pack.py nl2cypher 'Create uniqueness constraint for User.email'")
        print("  RULES='exactly six words' ask_with_pack.py eval6 'return exactly six words'")
        print("  MODEL='local/llama-cpu' ask_with_pack.py summary 'Summarize IntelGraph'")
        sys.exit(2)
    
    task = sys.argv[1]
    question = sys.argv[2]
    
    # Get environment variables
    rules = os.getenv("RULES", "")
    context = os.getenv("CONTEXT", "")
    model_override = os.getenv("MODEL")
    
    start_time = time.time()
    
    # Select optimal provider
    provider = choose_provider(task, override=model_override)
    
    # Get provider-specific configuration
    defaults, prompt_pack = get_provider_config(provider)
    
    # Override prompt pack if task specifies one
    caps = load_capabilities()
    task_pack = caps.get("tasks", {}).get(task, {}).get("pack")
    if task_pack:
        prompt_pack = task_pack
    
    # Load and render templates
    system_template, user_template = load_template(prompt_pack)
    
    system_prompt = system_template
    user_prompt = render_template(
        user_template,
        QUESTION=question,
        CONTEXT=context,
        RULES=rules
    )
    
    # Prepare LLM request
    payload = {
        "model": provider,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ],
        **defaults  # Apply provider-specific defaults
    }
    
    # Make request
    response = http_post_llm(payload)
    
    # Extract response
    success = "error" not in response
    if success:
        choices = response.get("choices", [])
        if choices:
            message = choices[0].get("message", {})
            content = message.get("content", "") or choices[0].get("text", "")
        else:
            content = "No response generated"
            success = False
    else:
        content = response.get("error", "Unknown error occurred")
        success = False
    
    # Calculate metrics
    end_time = time.time()
    latency_ms = int((end_time - start_time) * 1000)
    
    # Extract token usage if available
    tokens_used = None
    usage = response.get("usage", {})
    if usage:
        tokens_used = usage.get("total_tokens")
    
    # Log usage for optimization
    log_usage(task, provider, success, latency_ms, tokens_used)
    
    # Output response
    if success:
        print(content)
    else:
        print(f"Error: {content}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()
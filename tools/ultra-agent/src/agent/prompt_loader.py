import pathlib
import yaml

ROOT = pathlib.Path(__file__).resolve().parents[2]


def load_config(path: str | None = None) -> dict:
    cfg_path = ROOT / "config" / "agent-config.yaml" if path is None else pathlib.Path(path)
    if not cfg_path.exists():
         # Fallback to look relative to cwd if running from outside
         cfg_path = pathlib.Path("config/agent-config.yaml")

    with cfg_path.open("r", encoding="utf-8") as f:
        return yaml.safe_load(f)


def load_prompt_from_config(cfg: dict) -> str:
    prompt_file = cfg.get("prompt_file")
    if prompt_file:
        p_path = ROOT / prompt_file
        if not p_path.exists():
             p_path = pathlib.Path(prompt_file)
        if p_path.exists():
             return p_path.read_text(encoding="utf-8")

    # Fallback to inline prompt or error
    prompt = cfg.get("prompt", "").strip()
    if not prompt:
        # Try to find PROMPTS.md in default location
        p_path = ROOT / "prompts/PROMPTS.md"
        if p_path.exists():
            return p_path.read_text(encoding="utf-8")
        raise ValueError("No prompt found in config['prompt'] or config['prompt_file']")
    return prompt

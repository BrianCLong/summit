import pathlib
import yaml

ROOT = pathlib.Path(__file__).resolve().parents[2]


def load_config(path: str | None = None) -> dict:
    cfg_path = ROOT / "config" / "agent-config.yaml" if path is None else pathlib.Path(path)
    with cfg_path.open("r", encoding="utf-8") as f:
        return yaml.safe_load(f)


def load_prompt_from_config(cfg: dict) -> str:
    prompt = cfg.get("prompt", "").strip()
    if not prompt:
        raise ValueError("No prompt found in config['prompt']")
    return prompt

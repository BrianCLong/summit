import json
from dataclasses import dataclass, field
from typing import List, Optional, Dict
from pathlib import Path
import hashlib

@dataclass
class PromptRecord:
    prompt_id: str
    scene: str
    prompt_text: str
    subdomains: List[str]

@dataclass
class QARecord:
    question_id: str
    prompt_id: str
    question: str
    choices: List[str]
    answer_index: int
    subdomain: str
    omni_dim: Optional[str] = None

@dataclass
class PromptBundle:
    prompts: Dict[str, PromptRecord]
    questions: List[QARecord]

def load_prompt_bundle(jsonl_path: Path) -> PromptBundle:
    prompts = {}
    questions = []

    with open(jsonl_path, 'r') as f:
        for line in f:
            if not line.strip():
                continue
            data = json.loads(line)
            if "prompt_id" in data and "prompt_text" in data and "question" not in data:
                # This is a prompt record
                record = PromptRecord(
                    prompt_id=data["prompt_id"],
                    scene=data["scene"],
                    prompt_text=data["prompt_text"],
                    subdomains=data.get("subdomains", [])
                )
                prompts[record.prompt_id] = record
            elif "question_id" in data and "prompt_id" in data:
                # This is a QA record
                record = QARecord(
                    question_id=data["question_id"],
                    prompt_id=data["prompt_id"],
                    question=data["question"],
                    choices=data["choices"],
                    answer_index=data["answer_index"],
                    subdomain=data["subdomain"],
                    omni_dim=data.get("omni_dim")
                )
                questions.append(record)

    return PromptBundle(prompts=prompts, questions=questions)

def verify_data_provenance(file_path: Path, expected_hash: str) -> bool:
    """Verifies the SHA-256 hash of a data file."""
    if not file_path.exists():
        return False

    sha256_hash = hashlib.sha256()
    with open(file_path, "rb") as f:
        for byte_block in iter(lambda: f.read(4096), b""):
            sha256_hash.update(byte_block)

    return sha256_hash.hexdigest() == expected_hash

ALLOWLIST_HASHES = {
    "v0.1.0-minimal": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855" # Example: empty file
}

def is_hash_allowed(file_hash: str) -> bool:
    return file_hash in ALLOWLIST_HASHES.values()

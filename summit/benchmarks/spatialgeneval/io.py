from typing import List, Optional, Dict, Any
from dataclasses import dataclass

@dataclass
class PromptRecord:
    prompt_id: str
    scene: str
    prompt_text: str
    subdomains: List[str]

    def to_dict(self) -> Dict[str, Any]:
        return {
            "prompt_id": self.prompt_id,
            "scene": self.scene,
            "prompt_text": self.prompt_text,
            "subdomains": self.subdomains
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'PromptRecord':
        return cls(
            prompt_id=data["prompt_id"],
            scene=data["scene"],
            prompt_text=data["prompt_text"],
            subdomains=data["subdomains"]
        )

@dataclass
class QARecord:
    question_id: str
    prompt_id: str
    question: str
    choices: List[str]
    answer_index: int
    subdomain: str
    omni_dim: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        return {
            "question_id": self.question_id,
            "prompt_id": self.prompt_id,
            "question": self.question,
            "choices": self.choices,
            "answer_index": self.answer_index,
            "subdomain": self.subdomain,
            "omni_dim": self.omni_dim
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'QARecord':
        return cls(
            question_id=data["question_id"],
            prompt_id=data["prompt_id"],
            question=data["question"],
            choices=data["choices"],
            answer_index=data["answer_index"],
            subdomain=data["subdomain"],
            omni_dim=data.get("omni_dim")
        )

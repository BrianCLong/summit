from __future__ import annotations

import json
import re
from pathlib import Path
from typing import Any, Dict, List, Optional


class LanguageTransferMatrix:
    def __init__(
        self,
        matrix_version: str,
        source_languages: list[str],
        target_languages: list[str],
        transfer_values: list[list[float]],
        provenance: dict[str, Any]
    ):
        self.matrix_version = matrix_version
        self.source_languages = source_languages
        self.target_languages = target_languages
        self.transfer_values = transfer_values
        self.provenance = provenance
        self._validate()

    def _validate(self) -> None:
        if len(self.transfer_values) != len(self.source_languages):
            raise ValueError("Rows in transfer_values must match source_languages count")
        for row in self.transfer_values:
            if len(row) != len(self.target_languages):
                raise ValueError("Columns in transfer_values must match target_languages count")
            for val in row:
                if not (-1.0 <= val <= 1.0):
                    raise ValueError(f"Transfer value {val} out of range [-1, 1]")

        lang_pattern = re.compile(r"^[a-z]{2,3}(-[A-Z]{2})?$")
        for lang in self.source_languages + self.target_languages:
            if not lang_pattern.match(lang):
                raise ValueError(f"Invalid language code format: {lang}")

    @classmethod
    def from_json(cls, path: Path) -> LanguageTransferMatrix:
        with open(path, encoding="utf-8") as f:
            data = json.load(f)

        # In a real scenario, we'd use jsonschema here too
        # But we implement manual validation in _validate for robustness
        return cls(
            matrix_version=data["matrix_version"],
            source_languages=data["source_languages"],
            target_languages=data["target_languages"],
            transfer_values=data["transfer_values"],
            provenance=data["provenance"]
        )

    def get_transfer_score(self, source: str, target: str) -> float:
        try:
            s_idx = self.source_languages.index(source)
            t_idx = self.target_languages.index(target)
            return self.transfer_values[s_idx][t_idx]
        except ValueError:
            return 0.0

import json
from pathlib import Path

import pytest

from summit.planning.multilingual.transfer_matrix import LanguageTransferMatrix


def test_transfer_matrix_valid():
    matrix = LanguageTransferMatrix(
        matrix_version="1.0.0",
        source_languages=["en", "fr"],
        target_languages=["en", "es"],
        transfer_values=[
            [1.0, 0.5],
            [0.3, 0.8]
        ],
        provenance={"source": "test", "collected_at": "2026-01-01T00:00:00Z"}
    )
    assert matrix.get_transfer_score("en", "es") == 0.5
    assert matrix.get_transfer_score("fr", "en") == 0.3
    assert matrix.get_transfer_score("de", "en") == 0.0

def test_transfer_matrix_invalid_range():
    with pytest.raises(ValueError, match="out of range"):
        LanguageTransferMatrix(
            matrix_version="1.0.0",
            source_languages=["en"],
            target_languages=["en"],
            transfer_values=[[1.5]],
            provenance={"source": "test", "collected_at": "2026-01-01T00:00:00Z"}
        )

def test_transfer_matrix_invalid_dims():
    with pytest.raises(ValueError, match="match source_languages count"):
        LanguageTransferMatrix(
            matrix_version="1.0.0",
            source_languages=["en", "fr"],
            target_languages=["en"],
            transfer_values=[[1.0]],
            provenance={"source": "test", "collected_at": "2026-01-01T00:00:00Z"}
        )

def test_transfer_matrix_invalid_lang():
    with pytest.raises(ValueError, match="Invalid language code format"):
        LanguageTransferMatrix(
            matrix_version="1.0.0",
            source_languages=["english"],
            target_languages=["en"],
            transfer_values=[[1.0]],
            provenance={"source": "test", "collected_at": "2026-01-01T00:00:00Z"}
        )

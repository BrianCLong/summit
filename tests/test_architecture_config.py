from __future__ import annotations

from pathlib import Path

import pytest

from summit.config.architecture import KeelConfig, resolve_keel_alpha


def _parse_simple_yaml(path: Path) -> dict[str, str]:
    data: dict[str, str] = {}
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        key, value = line.split(":", 1)
        data[key.strip()] = value.strip()
    return data


def _config_from_fixture(name: str) -> KeelConfig:
    fixture_path = Path("tests/fixtures/configs") / name
    raw = _parse_simple_yaml(fixture_path)
    enabled = raw.get("enabled", "false").lower() == "true"
    num_layers = int(raw["num_layers"]) if "num_layers" in raw else None
    alpha_mode = raw.get("alpha_mode", "unset")
    const_alpha = float(raw["const_alpha"]) if "const_alpha" in raw else None
    return KeelConfig(
        enabled=enabled,
        alpha_mode=alpha_mode,
        num_layers=num_layers,
        const_alpha=const_alpha,
    )


def test_keel_disabled_fixture_validates() -> None:
    config = _config_from_fixture("keel_disabled.yaml")
    config.validate()


def test_keel_enabled_missing_alpha_fixture_fails() -> None:
    config = _config_from_fixture("keel_enabled_missing_alpha.yaml")
    with pytest.raises(ValueError, match="alpha_mode"):
        config.validate()


def test_keel_enabled_alpha_L_fixture_validates() -> None:
    config = _config_from_fixture("keel_enabled_alpha_L.yaml")
    config.validate()


def test_resolve_keel_alpha_modes() -> None:
    base = KeelConfig(enabled=True, num_layers=16, alpha_mode="L")
    base.validate()
    assert resolve_keel_alpha(base) == 16.0
    sqrt_config = KeelConfig(enabled=True, num_layers=25, alpha_mode="sqrtL")
    sqrt_config.validate()
    assert resolve_keel_alpha(sqrt_config) == 5.0
    const_config = KeelConfig(
        enabled=True,
        num_layers=8,
        alpha_mode="const",
        const_alpha=3.5,
    )
    const_config.validate()
    assert resolve_keel_alpha(const_config) == 3.5

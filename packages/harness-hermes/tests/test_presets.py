"""Presets must be parseable YAML with localhost-only endpoints and no secrets."""

from pathlib import Path

import yaml

CONFIG_DIR = Path(__file__).parent.parent / "config"
SECRETY = ("sk-", "token", "Bearer", "ghp_", "AKIA")


def test_presets_parse_and_are_secretless():
    presets = list(CONFIG_DIR.glob("*.yaml"))
    assert presets, "no presets found"
    for preset in presets:
        text = preset.read_text()
        data = yaml.safe_load(text)
        assert isinstance(data, dict), f"{preset.name}: not a mapping"
        for needle in SECRETY:
            assert needle not in text, f"{preset.name}: contains secret-like string {needle!r}"
        for key, value in data.items():
            if "url" in key and isinstance(value, str):
                assert value.startswith("http://localhost") or value.startswith(
                    "http://127.0.0.1"
                ), f"{preset.name}: {key} points off-localhost"

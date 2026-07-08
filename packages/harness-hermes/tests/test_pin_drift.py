"""Pin-drift gate: install.sh's HERMES_VERSION is the single source of truth;
README prose must cite the same pin (mirrors harness-omp's drift discipline —
recon 2026-07-08 found hermes had no such gate)."""

import re
from pathlib import Path

PKG = Path(__file__).resolve().parent.parent


def _pinned_version() -> str:
    install = (PKG / "install.sh").read_text()
    m = re.search(r'^HERMES_VERSION="([^"]+)"$', install, re.MULTILINE)
    assert m, "install.sh must define HERMES_VERSION"
    return m.group(1)


def test_install_pin_is_exact_semver():
    assert re.fullmatch(r"\d+\.\d+\.\d+", _pinned_version())


def test_readme_cites_the_installed_pin():
    version = _pinned_version()
    readme = (PKG / "README.md").read_text()
    assert f"hermes-agent` {version}" in readme or f"=={version}" in readme, (
        f"README does not cite pinned version {version} — update README when "
        "bumping install.sh (or vice versa)"
    )


def test_no_other_version_literals_disagree():
    """Any x.y.z that looks like a hermes pin in README must BE the pin."""
    version = _pinned_version()
    readme = (PKG / "README.md").read_text()
    cited = set(re.findall(r"hermes-agent[^\n]*?(\d+\.\d+\.\d+)", readme))
    assert cited <= {version}, f"README cites conflicting hermes versions: {cited}"

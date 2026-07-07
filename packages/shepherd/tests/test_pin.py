"""The install script must pin an exact shepherd-ai version, and docs must match it."""

import re
from pathlib import Path

PKG_DIR = Path(__file__).parent.parent


def _pinned_version() -> str:
    text = (PKG_DIR / "install.sh").read_text()
    match = re.search(r'^SHEPHERD_VERSION="(\d+\.\d+\.\d+)"$', text, re.M)
    assert match, "install.sh: no exact SHEPHERD_VERSION pin found"
    return match.group(1)


def test_install_uses_exact_pin_no_curl_bash():
    text = (PKG_DIR / "install.sh").read_text()
    version = _pinned_version()
    assert '"shepherd-ai==${SHEPHERD_VERSION}"' in text
    assert "curl" not in text, "install.sh must not fetch remote scripts"
    assert version.count(".") == 2


def test_readme_documents_the_same_pin():
    readme = (PKG_DIR / "README.md").read_text()
    assert _pinned_version() in readme, "README pin drifted from install.sh"

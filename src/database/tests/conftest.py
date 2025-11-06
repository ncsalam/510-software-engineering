
import os
import sys
import pathlib
import contextlib
import pytest
import requests

# Make src/database importable (parent of this tests folder)
ROOT = pathlib.Path(__file__).resolve().parent.parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

@contextlib.contextmanager
def chdir(path):
    old = os.getcwd()
    os.chdir(path)
    try:
        yield
    finally:
        os.chdir(old)

@pytest.fixture
def tmp_workdir(tmp_path):
    """Create and chdir into a temporary working directory for filesystem tests."""
    with chdir(tmp_path):
        yield tmp_path

class _FakeResp:
    def __init__(self, status_code=200, json_data=None, text=''):
        self.status_code = status_code
        self._json = json_data or {}
        self.text = text

    def json(self):
        return self._json

    def raise_for_status(self):
        """Mimic requests.Response.raise_for_status()."""
        if 400 <= int(self.status_code):
            raise requests.exceptions.HTTPError(f"status {self.status_code}")

@pytest.fixture
def FakeResp():
    return _FakeResp

@pytest.fixture(autouse=True)
def isolate_env(monkeypatch):
    """Provide dummy API keys to avoid hitting real services."""
    monkeypatch.setenv("PLACES_API_KEY", "dummy-places")
    monkeypatch.setenv("SEARCH_API_KEY", "dummy-search")
    monkeypatch.setenv("CX_ID", "dummy-cx")
    monkeypatch.setenv("OPENAI_API_KEY", "dummy-openai")
    yield


import pytest
import google_tools as gt

def test_build_payload_uses_env_and_params(monkeypatch):
    """Test: build_payload incorporates env API keys and provided params."""
    monkeypatch.setenv("SEARCH_API_KEY", "K")
    monkeypatch.setenv("CX_ID", "CX")
    payload = gt.build_payload("pizza", start=2, num=3, safe="active")
    assert payload["key"] == "K"
    assert payload["cx"] == "CX"
    assert payload["q"] == "pizza"
    assert payload["num"] == 3
    assert payload["safe"] == "active"

def test_send_payload_success_returns_first_link(monkeypatch, FakeResp):
    """Test: send_payload returns first result link on HTTP 200."""
    def fake_get(url, params):
        assert "customsearch/v1" in url
        return FakeResp(200, {"items": [{"link": "http://first"}, {"link": "http://second"}]})
    monkeypatch.setattr(gt.requests, "get", fake_get)
    assert gt.send_payload({"any": "thing"}) == "http://first"

def test_send_payload_non200_raises_and_prints_code(monkeypatch, capsys, FakeResp):
    """Test: non-200 response triggers exception and prints status code."""
    def fake_get(url, params):
        return FakeResp(500, {"error": "nope"})
    monkeypatch.setattr(gt.requests, "get", fake_get)
    with pytest.raises(Exception):
        gt.send_payload({"x": 1})
    out = capsys.readouterr().out
    assert "500" in out

def test_restaurant_search_writes_unique_names(tmp_workdir, monkeypatch, FakeResp):
    """Test: restaurant_search writes a deduplicated comma-separated list of names."""
    d = tmp_workdir / "src" / "database"
    d.mkdir(parents=True)

    results = {"places": [
        {"displayName": {"text": "A"}},
        {"displayName": {"text": "B"}},
        {"displayName": {"text": "A"}},
    ]}

    def fake_post(url, headers, data):
        assert headers["X-Goog-Api-Key"]
        return FakeResp(200, results)

    monkeypatch.setattr(gt.requests, "post", fake_post)

    gt.restaurant_search(["Italian", "Mexican"], "Raleigh")

    out_file = d / "Restaurant_List.txt"
    assert out_file.exists()
    content = out_file.read_text(encoding="utf-8")
    parts = content.split(",")
    assert parts.count("A") == 1 and parts.count("B") == 1

def test_build_payload_leaves_unknown_params(monkeypatch):
    """Test: build_payload forwards arbitrary params (e.g., 'safe', 'num')."""
    monkeypatch.setenv("SEARCH_API_KEY", "K2")
    monkeypatch.setenv("CX_ID", "CX2")
    payload = gt.build_payload("sushi", start=1, num=9, safe="off")
    assert payload["num"] == 9 and payload["safe"] == "off"
    assert payload["key"] == "K2" and payload["cx"] == "CX2"

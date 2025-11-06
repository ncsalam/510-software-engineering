
import html_tools as ht

def test_extract_content_writes_when_over_min_lines(tmp_workdir, monkeypatch, FakeResp):
    """Test: content is written when page meets min_lines threshold."""
    html = "<html><body>" + "\n".join([f"line{i}" for i in range(10)]) + "</body></html>"
    def fake_get(url):
        return FakeResp(200, text=html)
    monkeypatch.setattr(ht.requests, "get", fake_get)

    out = tmp_workdir / "out.txt"
    ht.extract_content("http://x", str(out), min_lines=5, max_lines=100)
    assert out.exists()
    data = out.read_text(encoding="utf-8").splitlines()
    assert "line0" in data and "line9" in data

def test_extract_content_skips_when_under_min_lines(tmp_workdir, monkeypatch, FakeResp):
    """Test: file is not written when below min_lines."""
    html = "<html><body>only1\nonly2</body></html>"
    def fake_get(url):
        return FakeResp(200, text=html)
    monkeypatch.setattr(ht.requests, "get", fake_get)

    out = tmp_workdir / "skip.txt"
    ht.extract_content("http://y", str(out), min_lines=5, max_lines=100)
    assert not out.exists()

def test_extract_content_strips_unwanted_tags(tmp_workdir, monkeypatch, FakeResp):
    """Test: script/style/noscript content is removed before saving."""
    html = (
        "<html><body>keep1"
        "<script>BAD1</script>"
        "<style>BAD2</style>"
        "<noscript>BAD3</noscript>"
        "keep2</body></html>"
    )
    def fake_get(url):
        return FakeResp(200, text=html)
    monkeypatch.setattr(ht.requests, "get", fake_get)

    out = tmp_workdir / "no_tags.txt"
    ht.extract_content("http://z", str(out), min_lines=1, max_lines=100)
    data = out.read_text(encoding="utf-8")
    assert "keep1" in data and "keep2" in data
    assert "BAD1" not in data and "BAD2" not in data and "BAD3" not in data

def test_extract_content_respects_max_lines_and_skips(tmp_workdir, monkeypatch, FakeResp):
    """Test: pages exceeding max_lines are skipped to avoid huge outputs."""
    html = "<html><body>" + "\n".join([f"line{i}" for i in range(200)]) + "</body></html>"
    def fake_get(url):
        return FakeResp(200, text=html)
    monkeypatch.setattr(ht.requests, "get", fake_get)

    out = tmp_workdir / "too_big.txt"
    ht.extract_content("http://big", str(out), min_lines=10, max_lines=50)
    assert not out.exists()

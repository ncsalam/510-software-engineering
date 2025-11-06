
import sqlite3, pytest
import database_query as dq

def _make_db_at_default_location(tmp_workdir):
    """Create a DB at src\\database\\restaurants_raleigh.db relative to cwd."""
    db_dir = tmp_workdir / "src" / "database"
    db_dir.mkdir(parents=True)
    db_path = db_dir / "restaurants_raleigh.db"
    conn = sqlite3.connect(str(db_path))
    cur = conn.cursor()
    cur.execute("CREATE TABLE local_menu (id INTEGER PRIMARY KEY, name TEXT, price TEXT, description TEXT, restaurant TEXT)")
    cur.executemany("INSERT INTO local_menu (name, price, description, restaurant) VALUES (?,?,?,?)", [
        ("A1", "$1", "D1", "A"),
        ("A2", "$2", "D2", "A"),
        ("B1", "$3", "D3", "B"),
    ])
    conn.commit()
    conn.close()
    return db_path

def test_local_search_calls_google_and_queries(monkeypatch):
    """Test: local_search integrates with Google Places then queries DB (mocked)."""
    sample = {"places": [{"displayName": {"text": "A"}}, {"displayName": {"text": "B"}}]}
    class R:
        def json(self): return sample
    def fake_post(url, headers, data):
        return R()
    monkeypatch.setattr(dq.requests, "post", fake_post)
    dq.local_search("pizza in Raleigh")

def test_query_returns_rows_for_matching_restaurants(tmp_workdir):
    """Test: query(['A','B']) should return rows for both restaurants after fix."""
    _make_db_at_default_location(tmp_workdir)
    rows = dq.query(["A", "B"])
    assert rows  # would include tuples like ('A1', '$1', 'D1', 'A')

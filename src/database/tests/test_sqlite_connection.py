
import os, sqlite3
import sqlite_connection as sc  # module under test

def _fetchall(conn, q, params=()):
    cur = conn.cursor()
    cur.execute(q, params)
    return cur.fetchall()

def test_create_table_creates_schema(tmp_path):
    """Test: create_table builds the expected columns and types."""
    db = tmp_path / "t.db"
    conn = sc.connect_db(str(db))
    sc.create_table(conn)

    cols = _fetchall(conn, "PRAGMA table_info(local_menu)")
    # col: (cid, name, type, notnull, dflt_value, pk)
    names = [c[1] for c in cols]
    types = {c[1]: c[2] for c in cols}

    assert names == ["id", "name", "price", "description", "restaurant"]
    assert types["id"].upper().startswith("INTEGER")
    assert types["name"].upper() == "TEXT"
    assert types["price"].upper() == "TEXT"
    assert types["description"].upper() == "TEXT"
    assert types["restaurant"].upper() == "TEXT"

def test_insert_and_query_roundtrip(tmp_path):
    """Test: inserted row is persisted and readable."""
    conn = sc.connect_db(str(tmp_path / "t.db"))
    sc.create_table(conn)
    sc.insert_data(conn, "Burger", "$10", "Beef patty", "R1")
    rows = _fetchall(conn, "SELECT name, price, description, restaurant FROM local_menu")
    assert rows == [("Burger", "$10", "Beef patty", "R1")]

def test_insert_allows_null_price(tmp_path):
    """Test: price can be NULL."""
    conn = sc.connect_db(str(tmp_path / "t.db"))
    sc.create_table(conn)
    sc.insert_data(conn, "Salad", None, "Greens", "R2")
    rows = _fetchall(conn, "SELECT name, price FROM local_menu WHERE name=?", ("Salad",))
    assert rows == [("Salad", None)]

def test_read_file_lines_skips_blanks_and_trims(tmp_path):
    """Test: read_file_lines trims whitespace and drops empty lines."""
    p = tmp_path / "sample.txt"
    p.write_text("  a  \n\n b\n\n  c  \n", encoding="utf-8")
    lines = sc.read_file_lines(str(p))
    assert lines == ["a", "b", "c"]

def test_process_all_files_inserts_rows_and_sets_restaurant(tmp_path, capsys):
    """Test: process_all_files ingests per-file lines and sets restaurant from filename."""
    folder = tmp_path / "menus"
    folder.mkdir()
    (folder / "R1.txt").write_text("I1,$1,Desc1\nI2,$2,Desc2\n", encoding="utf-8")
    (folder / "R2.txt").write_text("X,$9,DescX\n", encoding="utf-8")

    conn = sc.connect_db(str(tmp_path / "t.db"))
    sc.create_table(conn)
    sc.process_all_files(conn, str(folder))

    out = capsys.readouterr().out
    assert "✅ 2 rows inserted from R1.txt (restaurant='R1')" in out
    assert "✅ 1 rows inserted from R2.txt (restaurant='R2')" in out

    rows = _fetchall(conn, "SELECT name, price, description, restaurant FROM local_menu ORDER BY restaurant, name")
    assert rows == [
        ("I1", "$1", "Desc1", "R1"),
        ("I2", "$2", "Desc2", "R1"),
        ("X", "$9", "DescX", "R2"),
    ]

def test_process_all_files_skips_malformed_lines_and_logs(tmp_path, capsys):
    """Test: malformed lines are skipped and a warning is printed."""
    folder = tmp_path / "menus"
    folder.mkdir()
    (folder / "R.txt").write_text("A,$1,DA\nONLYNAME\nB,$2,DB\n", encoding="utf-8")

    conn = sc.connect_db(str(tmp_path / "t.db"))
    sc.create_table(conn)
    sc.process_all_files(conn, str(folder))

    out = capsys.readouterr().out
    assert "⚠️ Skipping malformed line in R.txt: ONLYNAME" in out

    rows = _fetchall(conn, "SELECT COUNT(*) FROM local_menu")
    assert rows[0][0] == 2  # 2 valid rows inserted

def test_upload_data_builds_db_and_populates(tmp_path, capsys):
    """Test: upload_data creates DB file in given relative path and inserts rows."""
    relative = tmp_path / "dbroot"
    (relative / "Menu_CSVs").mkdir(parents=True)
    (relative / "Menu_CSVs" / "R1.txt").write_text("P,$3,Desc\n", encoding="utf-8")

    sc.upload_data(str(relative) + os.sep)

    db_file = relative / "restaurants_raleigh.db"
    assert db_file.exists()

    conn = sqlite3.connect(str(db_file))
    rows = _fetchall(conn, "SELECT name, price, description, restaurant FROM local_menu")
    assert rows == [("P", "$3", "Desc", "R1")]

    out = capsys.readouterr().out
    assert "🎉 All files processed and saved into 'restaurants_raleigh.db' successfully." in out

def test_connect_db_creates_new_file(tmp_path):
    """Test: connecting creates the sqlite file on disk."""
    db = tmp_path / "new.db"
    conn = sc.connect_db(str(db))
    conn.close()
    assert db.exists()

def test_process_all_files_ignores_non_files(tmp_path):
    """Test: subdirectories are ignored by process_all_files."""
    folder = tmp_path / "menus"
    folder.mkdir()
    (folder / "nested").mkdir()
    (folder / "R.txt").write_text("A,$1,DA\n", encoding="utf-8")

    conn = sc.connect_db(str(tmp_path / "t.db"))
    sc.create_table(conn)
    sc.process_all_files(conn, str(folder))

    rows = _fetchall(conn, "SELECT COUNT(*) FROM local_menu")
    assert rows[0][0] == 1

def test_insert_persists_after_reopen(tmp_path):
    """Test: data persists across closing and reopening the database."""
    dbp = tmp_path / "persist.db"
    conn = sc.connect_db(str(dbp))
    sc.create_table(conn)
    sc.insert_data(conn, "Noodles", "$7", "Yum", "Rz")
    conn.commit()
    conn.close()

    conn2 = sqlite3.connect(str(dbp))
    rows = _fetchall(conn2, "SELECT name, price FROM local_menu")
    assert rows == [("Noodles", "$7")]

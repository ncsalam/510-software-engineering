import os
import csv
import sqlite3

# ---------- Database Setup ----------

def connect_db(db_path: str):
    """Connect to the SQLite database (creates if not found)."""
    return sqlite3.connect(db_path)


def create_table(conn):
    """Create the 'local_menu' table in the database."""
    cur = conn.cursor()
    cur.execute("""
        CREATE TABLE IF NOT EXISTS local_menu (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT,
            price TEXT,
            restaurant TEXT
        )
    """)
    conn.commit()


# ---------- File Processing ----------

def read_file_lines(file_path: str):
    """Reads a generic text file and returns a list of lines."""
    with open(file_path, "r", encoding="utf-8") as f:
        lines = [line.strip() for line in f if line.strip()]
    return lines


def parse_line(line: str):
    """
    Parse a single line into [name, price].
    If the line has commas, use CSV parsing.
    Otherwise, try to split by the last space.
    """
    # Try comma-separated first
    try:
        parts = next(csv.reader([line]))
    except Exception:
        parts = [line]

    # If there’s only one part, maybe it’s space-separated (like "Burger $9.99")
    if len(parts) == 1 and " " in parts[0]:
        before, sep, after = parts[0].rpartition(" ")
        if sep and after.startswith("$"):
            parts = [before, after]

    # Pad if incomplete
    while len(parts) < 2:
        parts.append("")

    return parts[:2]  # name, price


def insert_data(conn, name: str, price: str, restaurant: str):
    """Insert a single record into the database."""
    cur = conn.cursor()
    cur.execute(
        "INSERT INTO local_menu (name, price, restaurant) VALUES (?, ?, ?)",
        (name, price, restaurant)
    )


def process_all_files(conn, folder_path: str):
    """Read all files from the folder and add their contents to the DB."""
    for filename in os.listdir(folder_path):
        file_path = os.path.join(folder_path, filename)
        if not os.path.isfile(file_path):
            continue

        restaurant = os.path.splitext(filename)[0]
        lines = read_file_lines(file_path)
        inserted = 0

        for line in lines:
            name, price = parse_line(line)
            insert_data(conn, name, price, restaurant)
            inserted += 1

        conn.commit()
        print(f"✅ {inserted} rows inserted from {filename} (restaurant='{restaurant}')")


# ---------- Main ----------

def upload_data():
    folder = "proj2/src/database/Menu_Files"  # Change to your folder path
    db_path = "proj2/src/database/restaurants_raleigh.db"

    conn = connect_db(db_path)
    create_table(conn)
    process_all_files(conn, folder)
    conn.close()

    print("🎉 All files processed and saved into 'restaurants_raleigh.db' successfully.")




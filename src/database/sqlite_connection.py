import os
import csv
import sqlite3

def _log(msg, verbose=False):
    if verbose:
        print(msg)

# ---------- Database Setup ----------

def connect_db(db_path: str):
    """Connect to the SQLite database (creates it if not found)."""
    return sqlite3.connect(db_path)


def create_table(conn):
    """Create the 'local_menu' table with description field."""
    cur = conn.cursor()
    cur.execute("""
        CREATE TABLE IF NOT EXISTS local_menu (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT,
            price TEXT DEFAULT NULL,
            description TEXT,
            restaurant TEXT
        )
    """)
    conn.commit()


# ---------- File Processing ----------

def read_file_lines(file_path: str):
    """Read a text file and return all non-empty lines."""
    with open(file_path, "r", encoding="utf-8") as f:
        lines = [line.strip() for line in f if line.strip()]
    return lines


def insert_data(conn, name: str, price: str, description: str, restaurant: str):
    """Insert a single record into the database."""
    cur = conn.cursor()
    cur.execute(
        "INSERT INTO local_menu (name, price, description, restaurant) VALUES (?, ?, ?, ?)",
        (name, price, description, restaurant)
    )


def process_all_files(conn, folder_path: str):
    """Read all files in a folder, parse as CSV lines, and insert into database."""
    for filename in os.listdir(folder_path):
        file_path = os.path.join(folder_path, filename)
        if not os.path.isfile(file_path):
            continue

        restaurant = os.path.splitext(filename)[0]
        lines = read_file_lines(file_path)
        inserted = 0

        for line in lines:
            try:
                name, price, description = next(csv.reader([line]))
            except ValueError:
                print(f"⚠️ Skipping malformed line in {filename}: {line}")
                continue

            insert_data(conn, name, price, description, restaurant)
            inserted += 1

        conn.commit()
        print(f"✅ {inserted} rows inserted from {filename} (restaurant='{restaurant}')")


def upload_data(relative_path):
    folder = f"{relative_path}Menu_CSVs"  # change to your actual folder
    db_path = f"{relative_path}restaurants_raleigh.db"

    conn = connect_db(db_path)
    create_table(conn)
    process_all_files(conn, folder)
    conn.close()

    print("🎉 All files processed and saved into 'restaurants_raleigh.db' successfully.")
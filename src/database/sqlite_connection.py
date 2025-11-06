"""SQLite helpers for loading reconstructed menus into a database.

This module creates a `local_menu` table (if needed) and bulk-loads rows from
CSV-formatted text files produced by the menu reconstruction step.
"""
import os
import csv
import sqlite3


# ---------- Database Setup ----------

def connect_db(db_path: str):
    """Connect to (or create) the SQLite database.

    Parameters
    ----------
    db_path : str
        Path to the SQLite file (will be created if it doesn't exist).

    Returns
    -------
    sqlite3.Connection
        An open SQLite connection. Caller is responsible for closing it.
    """
    return sqlite3.connect(db_path)


def create_table(conn):
    """Create the `local_menu` table if it does not already exist.

    The schema includes:
    - `id` INTEGER PRIMARY KEY AUTOINCREMENT
    - `name` TEXT
    - `price` TEXT (nullable)
    - `description` TEXT
    - `restaurant` TEXT

    Parameters
    ----------
    conn : sqlite3.Connection
        Open database connection on which to execute the DDL.
    """
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
    """Read a text file and return all non-empty lines.

    Parameters
    ----------
    file_path : str
        Path to a CSV-like text file (one menu row per line).

    Returns
    -------
    list[str]
        Lines stripped of surrounding whitespace and blank lines removed.
    """
    with open(file_path, "r", encoding="utf-8") as f:
        lines = [line.strip() for line in f if line.strip()]
    return lines


def insert_data(conn, name: str, price: str, description: str, restaurant: str):
    """Insert a single menu row into `local_menu`.

    Parameters
    ----------
    conn : sqlite3.Connection
        Open database connection.
    name : str
        Menu item name.
    price : str
        Menu item price (kept as text for flexibility).
    description : str
        Menu item description.
    restaurant : str
        Source restaurant name (derived from filename).
    """
    cur = conn.cursor()
    cur.execute(
        "INSERT INTO local_menu (name, price, description, restaurant) VALUES (?, ?, ?, ?)",
        (name, price, description, restaurant)
    )


def process_all_files(conn, folder_path: str):
    """Load all CSV-formatted text files from `folder_path` into `local_menu`.

    Under the hood:
    - Iterates files in `folder_path` (skips subdirectories).
    - Uses the stem (filename without extension) as the `restaurant` field.
    - Parses each line with `csv.reader` to safely split `name,price,description`.
    - Commits after each file and prints a short progress message.

    Parameters
    ----------
    conn : sqlite3.Connection
        Open database connection.
    folder_path : str
        Directory containing reconstructed menu CSVs (no header).
    """
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
    """Create the database and load all CSVs under `relative_path`/`Menu_CSVs`.

    Parameters
    ----------
    relative_path : str
        Base directory containing `Menu_CSVs` and where the SQLite DB will be placed.

    Returns
    -------
    None
        Prints a final success message after processing.
    """
    folder = f"{relative_path}Menu_CSVs"  # change to your actual folder
    db_path = f"{relative_path}restaurants_raleigh.db"

    conn = connect_db(db_path)
    create_table(conn)
    process_all_files(conn, folder)
    conn.close()

    print("🎉 All files processed and saved into 'restaurants_raleigh.db' successfully.")
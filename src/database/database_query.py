"""Database querying helpers for the restaurant menu pipeline.

This module provides:
- A thin wrapper around the Google Places Text Search API to collect restaurant names.
- A helper to query the local SQLite database for menu rows matching a list of restaurants.

Environment:
- PLACES_API_KEY must be set for Google Places API access.
- The SQLite database is expected at `src/database/restaurants_raleigh.db` (preferred)
  or `./restaurants_raleigh.db` as a fallback.
"""
import os
import json
import requests
import sqlite_connection


# Used for the retrieval of relevant restaurants based on 
# the user's parsed voice input


# Local search takes the query (ex. "Chinese food in Raleigh")
# and uses the google places API which will look for places
# that meet that description, and return their names
def local_search(query_string):
    """Look up restaurant names via the Google Places Text Search API.

    Under the hood:
    - Builds a POST request to `https://places.googleapis.com/v1/places:searchText`
      with the provided free-form query string.
    - Requests only the `places.displayName` field to reduce payload size.
    - Parses the response and collects the visible place names.
    - Delegates to :func:`query` to fetch matching menu rows from SQLite.

    Parameters
    ----------
    query_string : str
        A human-readable search like "Chinese food in Raleigh".

    Returns
    -------
    list[tuple]
        Rows from the `local_menu` table for any matching restaurant names.
    """
    search_list = []
    url = "https://places.googleapis.com/v1/places:searchText"
    headers = {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": os.environ['PLACES_API_KEY'],
        "X-Goog-FieldMask": "places.displayName"
    }

    payload = {"textQuery": f"{query_string}"}

    r = requests.post(url, headers=headers, data=json.dumps(payload))
    r = r.json()

    for place in r['places']:
        search_list.append(place['displayName']['text'])

    return query(search_list)
  
  
# Used the database created through main.py to retieve menu items
# for the restaurants found in local_search
def query(search_list):
    """Fetch menu rows for the given list of restaurants from SQLite.

    Under the hood:
    - Chooses the database path preferring `src/database/restaurants_raleigh.db`
      when present, otherwise falls back to `./restaurants_raleigh.db`.
    - Uses a single parameterized `SELECT` with an IN-clause to fetch all rows.
    - Closes the connection reliably via a `try/finally` block.

    Parameters
    ----------
    search_list : list[str]
        Restaurant names to match against the `restaurant` column.

    Returns
    -------
    list[tuple]
        Result rows from the `local_menu` table. Empty list if `search_list` is empty.
    """
    # Prefer the test location (cwd/src/database/...), then fall back to ./restaurants_raleigh.db
    primary = os.path.join("src", "database", "restaurants_raleigh.db")
    db_path = primary if os.path.exists(primary) else "restaurants_raleigh.db"

    conn = sqlite_connection.connect_db(db_path)
    try:
        if not search_list:
            return []
        cur = conn.cursor()
        placeholders = ",".join("?" for _ in search_list)
        rows = cur.execute(
            f"SELECT * FROM local_menu WHERE restaurant IN ({placeholders})",
            tuple(search_list)
        ).fetchall()
        return rows
    finally:
        conn.close()
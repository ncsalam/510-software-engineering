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
  search_list = []
  url = "https://places.googleapis.com/v1/places:searchText"
  headers = {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": os.environ['PLACES_API_KEY'],
      "X-Goog-FieldMask": "places.displayName"
  }

  payload = {
    "textQuery": f"{query_string}"
  }

  r = requests.post(url, headers=headers, data=json.dumps(payload))
  r = r.json()

  for place in r['places']:
    search_list.append(place['displayName']['text'])

  return query(search_list)
  
  
# Used the database created through main.py to retieve menu items
# for the restaurants found in local_search
def query(search_list):
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
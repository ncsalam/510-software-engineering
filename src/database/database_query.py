import os
import json
import requests
import sqlite_connection

# Used for the retrieval of relevant restaurants based on 
# the user's parsed voice input


# Local search takes the query (ex. "Chinese food in Raleigh")
# and uses the google places API which will look for places
# that meet that description, and return their names
def local_search(query):
  search_list = []
  url = "https://places.googleapis.com/v1/places:searchText"
  headers = {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": os.environ['PLACES_API_KEY'],
      "X-Goog-FieldMask": "places.displayName"
  }

  payload = {
    "textQuery": f"{query}"
  }

  r = requests.post(url, headers=headers, data=json.dumps(payload))
  r = r.json()

  for place in r['places']:
    search_list.append(place['displayName']['text'])

  return query(search_list)
  
  
# Used the database created through main.py to retieve menu items
# for the restaurants found in local_search
def query(search_list):
  db_path = "src\\database\\restaurants_raleigh.db"
  conn = sqlite_connection.connect_db(db_path)
  cur = conn.cursor()
  results = cur.execute(f"""
    SELECT * FROM local_menu
    WHERE restaurant IN {search_list}
  """)
  conn.close()
  return results






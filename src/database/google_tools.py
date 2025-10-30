import os
import requests
import json


# Step one. 
# Needs a list of strings containing cuisines and string of a location name
# Example: ["Chinese", "Indian", "American", "South American"] "Raleigh"
def restaurant_search(cuisine_list, location):
  restaurant_list = []
  file_name = "Restaurant_List.txt"

  url = "https://places.googleapis.com/v1/places:searchText"
  headers = {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": os.environ['PLACES_API_KEY'],
      "X-Goog-FieldMask": "places.id,places.displayName"
  }

  for cuisine in cuisine_list:
    payload = {
        "textQuery": f"{cuisine} Restaurants in {location}"
    }
    r = requests.post(url, headers=headers, data=json.dumps(payload))
    r = r.json()

    for place in r['places']:
      if place['displayName']['text'] not in restaurant_list:
        restaurant_list.append(place['displayName']['text'])

  with open("proj2\\src\\database\\Restaurant_List.txt", "w", encoding="utf-8") as file:
    file.write(",".join(restaurant_list))

def build_payload(query, start=1, num=1, **params):
    API_KEY = os.getenv('SEARCH_API_KEY')
    CX = os.getenv('CX_ID')
    
    payload = {
        'key':API_KEY,
        'q':query,
        'cx':CX,
        'num':num
    }
    payload.update(params)
    return payload

def send_payload(payload):
    response = requests.get('https://www.googleapis.com/customsearch/v1', params=payload)
    if response.status_code != 200:
        print(response.status_code)
        raise Exception('Request Failed')
    result = response.json()
    link = result['items'][0]['link']
    return link
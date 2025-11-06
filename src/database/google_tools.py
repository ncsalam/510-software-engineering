"""Google API helpers for discovering restaurants and their menus.

This module provides:
- `restaurant_search`: uses Google Places Text Search to compile a restaurant list
  for a set of cuisines in a given location and writes it to `src\\database\\Restaurant_List.txt`.
- `build_payload` and `send_payload`: small helpers to call Google Custom Search and
  retrieve the first result link for a given query.

Environment:
- PLACES_API_KEY (Places API) for `restaurant_search`.
- SEARCH_API_KEY and CX_ID (Custom Search JSON API) for `send_payload`.
"""
import os
import requests
import json


# Step one. 
# Needs a list of strings containing cuisines and string of a location name
# Example: ["Chinese", "Indian", "American", "South American"] "Raleigh"
def restaurant_search(cuisine_list, location):
    """Build a de-duplicated list of restaurants for the given cuisines and location.

    Under the hood:
    - Calls Google Places Text Search for each cuisine string combined with the `location`.
    - Requests the `places.id` and `places.displayName` fields.
    - Collects unique restaurant display names in memory.
    - Writes the final comma-separated list to `src\\database\\Restaurant_List.txt`.

    Parameters
    ----------
    cuisine_list : list[str]
        Example: `["Chinese", "Indian"]`.
    location : str
        Example: `"Raleigh"`.

    Returns
    -------
    None
        This function writes to disk for subsequent pipeline steps.
    """
    restaurant_list = []
    file_name = "Restaurant_List.txt"

    url = "https://places.googleapis.com/v1/places:searchText"
    headers = {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": os.environ['PLACES_API_KEY'],
        "X-Goog-FieldMask": "places.id,places.displayName"
    }

    for cuisine in cuisine_list:
        payload = {"textQuery": f"{cuisine} Restaurants in {location}"}
        r = requests.post(url, headers=headers, data=json.dumps(payload))
        r = r.json()

        for place in r['places']:
            if place['displayName']['text'] not in restaurant_list:
                restaurant_list.append(place['displayName']['text'])

    with open("src\\database\\Restaurant_List.txt", "w", encoding="utf-8") as file:
        file.write(",".join(restaurant_list))


def build_payload(query, start=1, num=1, **params):
    """Construct a Google Custom Search JSON API request payload.

    Parameters
    ----------
    query : str
        The search string (e.g., `'Sushi Raleigh menu'`).
    start : int, optional
        Starting index for results (1-based as per API), by default 1.
    num : int, optional
        Number of results to return, by default 1.
    **params :
        Additional query parameters to merge into the payload.

    Returns
    -------
    dict
        A dictionary suitable for `requests.get(..., params=payload)`.
    """
    API_KEY = os.getenv('SEARCH_API_KEY')
    CX = os.getenv('CX_ID')
    
    payload = {
        'key': API_KEY,
        'q': query,
        'cx': CX,
        'num': num
    }
    payload.update(params)
    return payload


def send_payload(payload):
    """Execute a Google Custom Search request and return the first result link.

    Parameters
    ----------
    payload : dict
        The query parameters built by :func:`build_payload`.

    Returns
    -------
    str
        The `link` of the first search result.

    Raises
    ------
    Exception
        If the HTTP request fails (non-200 status code).
    """
    response = requests.get('https://www.googleapis.com/customsearch/v1', params=payload)
    if response.status_code != 200:
        print(response.status_code)
        raise Exception('Request Failed')
    result = response.json()
    link = result['items'][0]['link']
    return link
# Restaurant Menu Pipeline

A lightweight pipeline that discovers local restaurants for specified cuisines and locations, finds likely menu pages, extracts readable page text, reconstructs menus via an LLM, and loads the results into a local SQLite database for querying.

---

## Table of Contents
- [What it is](#what-it-is)
- [How it works](#how-it-works)
- [Prerequisites](#prerequisites)
- [API requirements](#api-requirements)
- [Usage](#usage)
- [Database schema](#database-schema)
- [Documentation](#documentation)

---

## What it is
This project builds a structured, searchable menu dataset by:
1) collecting restaurant names (by cuisine + location),
2) resolving each to a likely “menu” URL,
3) extracting the page’s readable text,
4) reconstructing a clean `Dish, Price, Description` CSV via an LLM, and
5) loading those rows into a local SQLite database.

**Primary use case:** feed a downstream app (e.g., a local food search) with normalized menu data.

---

## How it works
High-level flow (modules in `src/database/`):

1. **Restaurant discovery** — `google_tools.restaurant_search`  
   Calls **Google Places Text Search** for each cuisine in a location and writes a de-duplicated list to `Restaurant_List.txt`.

2. **URL resolution** — `Main.create_url_list` → `google_tools.build_payload` + `send_payload`  
   Uses **Google Custom Search JSON API** to get the top link for `{restaurant} Menu`, saving all links to `URL_List.txt`.

3. **Content snapshot** — `html_tools.extract_content`  
   Fetches each URL, strips scripts/styles, normalizes text, and writes a plain-text snapshot into `Raw_Website_Content/`.

4. **Menu reconstruction** — `menu_recreator.recreate_menu`  
   Sends the snapshot to an **OpenAI** chat model with strict CSV-only instructions, producing `Dish,Price,Description` rows (no header) in `Menu_CSVs/`.

5. **Database load** — `sqlite_connection.upload_data`  
   Creates (if needed) and populates `restaurants_raleigh.db` with rows from `Menu_CSVs/`.

6. **Querying** — `database_query.local_search/query`  
   Optionally uses Places again to map a user’s free-text search to restaurant names, then returns matching rows from SQLite.

---

## Prerequisites
- Python 3.10+ (recommended)
- Packages:
  - `requests`
  - `beautifulsoup4`
  - `openai`
- (Optional) `sphinx` for docs

---

## API Requirements
- Google Places API
  - Enable Places API in your Google Cloud Project
  - Set `PLACES_API_KEY=<Your Key>`
- Google Custom Search JSON API
  - Create/configure a Custom Search Engine (CSE) for the web
  - Enable Custom Search API
  - Set `SEARCH_API_KEY=<Your Key>` & `CX_ID=<Your Key>`
- OpenAI API
  - Set `OPENAI_API_KEY=<Your Key>`
- Notes
  - Quotas and billing apply for Google and OpenAI services.
  - `Restaurant_List.txt` and `URL_List.txt` are cached to control costs on repeated runs
  - Cost of use is about $0.15 for each cuisine included in the search.

---

## Usage
- Main functionality (Building and filling database)
  - `python src/database/Main.py`
  - You will be prompted for a comma-separated list of cuisines (ex. `Chinese, Indian, American`)
  - The location (ex. `Raleigh`)
- Artifacts produced:
  - `Restaurant_List.txt` and `URL_List.txt`
  - `Raw_Website_Content/` text snapshots of websites
  - `Menu_CSVs/` reconstructed menus in CSV format
  - `restaurants_<city>.db` with table `local_menu`

---

## Database Schema
| Column        | Type    | Null | Key | Default | Description                                     |
| ------------- | ------- | ---- | --- | ------- | ----------------------------------------------- |
| `id`          | INTEGER | NO   | PK  | —       | Auto-increment primary key.                     |
| `name`        | TEXT    | YES  | —   | —       | Menu item name.                                 |
| `price`       | TEXT    | YES  | —   | `NULL`  | Menu item price (kept as text for flexibility). |
| `description` | TEXT    | YES  | —   | —       | Short description of the item.                  |
| `restaurant`  | TEXT    | YES  | —   | —       | Source restaurant name (from filename).         |

---

## Documentation
- See [Python Documentation](src/database/docs/build/html/index.html)

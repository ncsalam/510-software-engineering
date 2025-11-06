"""Pipeline entry point for rebuilding local restaurant menus.

This script orchestrates the end-to-end flow:
1) Ensure `Restaurant_List.txt` exists (or prompt the user and create it).
2) Ensure `URL_List.txt` exists (or query and create it).
3) Fetch and store cleaned text snapshots for each restaurant page.
4) Ask the LLM to reconstruct menus from snapshots and write CSVs.
5) Load all CSVs into a local SQLite database via `sqlite_connection.upload_data`.

Folders & files under `relative_path` (default `src\\database\\`):
- Raw_Website_Content\\ : text snapshots per restaurant
- Menu_CSVs\\           : LLM-recreated menu rows as CSV (no header)
- Restaurant_List.txt   : comma-separated restaurant names
- URL_List.txt          : comma-separated source URLs
"""
import os
import google_tools
import html_tools
import menu_recreator
import time
import sqlite_connection


def create_restaurant_list():
    """Prompt for cuisines & location and generate `Restaurant_List.txt`.

    Uses :func:`google_tools.restaurant_search` to build a de-duplicated list of
    restaurant names and saves it under `relative_path`.
    """
    cuisines = input("Enter Cuisines as a Comma-Separated List: ")
    cuisine_list = cuisines.split(",")
    location = input("Where would you like to search: ")
    google_tools.restaurant_search(cuisine_list, location)


def open_restaurant_list():
    """Load `Restaurant_List.txt`, creating it on demand if missing.

    Returns
    -------
    list[str]
        The restaurant names parsed from the file.
    """
    try:
        with open(relative_path+"Restaurant_List.txt", "r", encoding="utf-8") as f:
            restaurant_list = f.read().split(",")
            print("✅ Restaurant List Detected")
            return restaurant_list
    except FileNotFoundError:
        create_restaurant_list()
        with open(relative_path+"Restaurant_List.txt", "r", encoding="utf-8") as f:
            restaurant_list = f.read().split(",")
            print("✅ Restaurant List Created")
            return restaurant_list


def create_url_list():
    """Resolve each restaurant into a likely menu URL and save `URL_List.txt`.

    Under the hood:
    - For each restaurant name, calls Google Custom Search for a `{name}-Raleigh Menu` query.
    - Keeps only the top link for speed/cost.
    - Writes a comma-separated list of URLs for later reuse.
    """
    url_list = []
    # Generate and collect new URLs
    for restaurant in restaurant_list:
        query = f"{restaurant}-Raleigh Menu"
        payload = google_tools.build_payload(query, start=1, num=1)
        url = google_tools.send_payload(payload)
        url_list.append(url)
    # Save URLs to txt file to make subsequent runs faster and cheaper
    with open(relative_path+"URL_List.txt", "w", encoding="utf-8") as file:
        file.write(",".join(url_list))


def open_url_list():
    """Load `URL_List.txt`, creating it on demand if missing.

    Returns
    -------
    list[str]
        A list of candidate menu-page URLs (comma separated in the file).
    """
    try:
        with open(relative_path+"URL_List.txt", "r", encoding="utf-8") as file:
            content = file.read().strip()
            url_list = content.split(",")
            print("✅ URL List Detected.")
            return url_list
    except FileNotFoundError:
        create_url_list()
        with open(relative_path+"URL_List.txt", "r", encoding="utf-8") as f:
            url_list = f.read().split(",")
            print("✅ URL List Created")
            return url_list


def make_website_content_folder():
    """Create the snapshot folder for raw website content if needed.

    Uses the path configured in `content_folder_path`.
    """
    try:
        os.mkdir(content_folder_path)
        print(f"Folder '{content_folder_path}' created successfully.")
    except FileExistsError:
        print(f"Folder '{content_folder_path}' already exists.")


def extract_website_content():
    """Fetch, clean, and save text snapshots for each URL in `url_list`.

    Writes files named after the corresponding restaurant under `content_folder_path`.
    """
    i = 0
    for url in url_list:
        restaurant_name = restaurant_list[i]
        html_tools.extract_content(url, f"{content_folder_path}\\{restaurant_name}.txt")
        i += 1


def make_csv_folder():
    """Create the output CSV folder if needed (`csv_folder_path`)."""
    try:
        os.mkdir(csv_folder_path)
        print(f"Folder '{csv_folder_path}' created successfully.")
    except FileExistsError:
        print(f"Folder '{csv_folder_path}' already exists.")


def create_menu():
    """Convert each text snapshot into a structured CSV via the LLM.

    Under the hood:
    - Iterates `content_folder_path` for `.txt` files.
    - Reads the snapshot text and calls :func:`menu_recreator.recreate_menu`.
    - Sleeps briefly to be polite and to avoid hammering the API.
    """
    for filename in os.listdir(content_folder_path):
        if filename.endswith(".txt"):
            file_path = os.path.join(content_folder_path, filename)
            try:
                with open(file_path, "r", encoding="utf-8") as file:
                    content = file.read()
                    csv_name = filename.removesuffix(".txt")
                    menu_recreator.recreate_menu(content, csv_folder_path+csv_name)
                    print("Chat has returned")
                    time.sleep(3)
            except Exception as e:
                print(f"Error reading {file_path}: {e}")


if __name__ == "__main__":
    relative_path = "src\\database\\"
    content_folder_path = relative_path+"Raw_Website_Content"
    csv_folder_path = relative_path+"Menu_CSVs\\"

    restaurant_list = open_restaurant_list()
    url_list = open_url_list()
    make_website_content_folder()
    extract_website_content()
    make_csv_folder()
    create_menu()
    sqlite_connection.upload_data(relative_path)